package co.petrin;

import co.petrin.function.TriFunction;
import io.vertx.core.Vertx;
import io.vertx.core.buffer.Buffer;
import io.vertx.core.json.Json;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.RoutingContext;
import io.vertx.ext.web.handler.BodyHandler;
import org.apache.commons.lang3.StringUtils;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.toList;

/**
 * Lists available databases and executes code on them.
 */
public class ScriptHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ScriptHandler.class);
    private static final Logger SCRIPT_LOG = LoggerFactory.getLogger("script.eval");

    private static final String DATABASE_CTX_KEY = "database";
    private static final String REQUEST_CTX_KEY = "request";
    private static final String EVALUATION_RESULT_KEY = "evalresult";

    /** Paths can either have a database ID prefixed or not */
    private static final String DB_ENDPOINTS_PREFIX = "(?:/[0-9]+)?";

    /** Maximum length of scripts incoming in request bodies in bytes */
    private static final long BODY_SIZE_LIMIT = 100_000; // is this enough?

    /** Separator between JSON records */
    private static final Buffer NEWLINE_BUFFER = Buffer.buffer("\n");

    /** All the configured databases, read on instantiation form environment variables */
    private final List<Database> databases;

    /** The database list in JSON form for sending down to clients */
    private final String databasesJson;

    /** Name of the system variable containing a whitespace-separated classpath to provide a remote evaluator with */
    private static final String EVALUATOR_CLASSPATH_ENVIRONMENT_VARIABLE = "EVALUATOR_CLASSPATH";

    public ScriptHandler() {
        databases = Database.parseFromEnvironment();
        databasesJson = getDatabasesJson(databases);
        if (databases.isEmpty()) {
            LOG.warn("No databases were found!");
        } else {
            LOG.info("Found " + databases.size() + " databases:");
            for (var db : databases) {
                LOG.info("  " + db.toString());
            }
        }
    }

    /**
     * Creates a vertx router that serves the list of stored databases for GET / and evals scripts on POST {dbId}/eval.
     * @param vertx The vertx instance to create the router on.
     */
    public Router getRouter(Vertx vertx) {

        var router = Router.router(vertx);

        // simple list request
        router.get("/").handler(this::listDatabases);

        // evaluation requests
        router.routeWithRegex("/([0-9]+).*").handler(this::populateDatabaseId);
        router.post().handler(BodyHandler.create(false).setBodyLimit(BODY_SIZE_LIMIT)).blockingHandler(this::extractEvaluationRequest);

        router.postWithRegex(DB_ENDPOINTS_PREFIX + "/eval").blockingHandler(ctx -> {
            Database db = ctx.get(DATABASE_CTX_KEY);
            EvaluationRequest req = ctx.get(REQUEST_CTX_KEY);
            if (SCRIPT_LOG.isInfoEnabled()) {
                var dbDescriptor = db != null ? db.toString() : "without a database";
                SCRIPT_LOG.info("Evaluating script (" + dbDescriptor + "): " + req.getScript());
            }

            var response = getEvaluator(ctx).evaluate(db, req);
            ctx.put(EVALUATION_RESULT_KEY, response);
            ctx.next();

            prepareEvaluator();
        }).handler(ctx -> {
            EvaluationResponse response = ctx.get(EVALUATION_RESULT_KEY);
            int returnStatus = 200;
            if (response != null && response.isError()) {
                returnStatus = 400;
            }

            ctx.response()
                .setChunked(true)
                .setStatusCode(returnStatus)
                .putHeader("content-type", "application/json; charset=UTF-8")
                .write(Json.encode(response))
                .end(NEWLINE_BUFFER);
        });

        router.postWithRegex(DB_ENDPOINTS_PREFIX + "/suggest").blockingHandler(ctx -> {
            Database db = ctx.get(DATABASE_CTX_KEY);
            EvaluationRequest req = ctx.get(REQUEST_CTX_KEY);
            ctx.put(EVALUATION_RESULT_KEY, getEvaluator(ctx).suggest(db, req));
            ctx.next();
        }).handler(ctx -> ctx
            .response()
            .putHeader("content-type", "application/json; charset=UTF-8")
            .end(Json.encode(ctx.get(EVALUATION_RESULT_KEY))))
        ;

        router.postWithRegex(DB_ENDPOINTS_PREFIX + "/javadoc").blockingHandler(ctx -> {
            Database db = ctx.get(DATABASE_CTX_KEY);
            EvaluationRequest req = ctx.get(REQUEST_CTX_KEY);
            ctx.put(EVALUATION_RESULT_KEY, getEvaluator(ctx).javadoc(db, req));
            ctx.next();
        }).handler(ctx -> ctx
            .response()
            .putHeader("content-type", "application/json; charset=UTF-8")
            .end(Json.encode(ctx.get(EVALUATION_RESULT_KEY)))
        );


        return router;
    }

    private void listDatabases(RoutingContext ctx) {
        ctx.response().putHeader("Content-Type", "application/json").end(databasesJson);
    }

    private static String getDatabasesJson(List<Database> databaseList) {
        return new JsonObject(
            databaseList.stream()
                .collect(Collectors.toMap(db -> Integer.toString(db.id), db -> db.description))
        ).toString();
    }

    /**
     * Gets an evaluator, binding it to the current request: if it ends prematurely, the evaluator will attempt to be
     * stopped.
     */
    private Evaluator getEvaluator(RoutingContext ctx) {
        var evaluator = Objects.requireNonNullElseGet(evaluators.poll(), this::createEvaluator);
        ctx.response().closeHandler(ch -> evaluator.stop());
        return evaluator;
    }

    /**
     * Creates the evaluator to run for a certain request.
     * @return A constructed evaluator.
     */
    private Evaluator createEvaluator() {
        var evalCp = StringUtils.defaultIfEmpty(System.getenv(EVALUATOR_CLASSPATH_ENVIRONMENT_VARIABLE), "");
        var cpList = Arrays.stream(evalCp.split("\\s")).filter(StringUtils::isNotBlank).collect(toList());
        return Evaluator.spawn(cpList);
    }

    private ConcurrentLinkedQueue<Evaluator> evaluators = new ConcurrentLinkedQueue<>();
    private void prepareEvaluator() {
        // TODO: do this in a thread pool or something?
        Evaluator evaluator = createEvaluator();
        evaluator.init();
        evaluators.add(evaluator);
    }

    private Database getDatabase(int dbId) {
        return databases
            .stream()
            .filter(dbConfig -> dbConfig.id == dbId)
            .findAny()
            .orElse(null);
    }

    /**
     * Extract the database if it was provided as the first path segment in the request. Put the database
     * configuration into the DATABASE_CTX_KEY request parameter.
     */
    private void populateDatabaseId(RoutingContext ctx) {
        final var dbId = Integer.parseInt(ctx.request().getParam("param0"));
        var db = getDatabase(dbId);
        if (db == null) {
            ctx.response().setStatusCode(400).end("Database " + dbId + " not found!");
        } else {
            ctx.put(DATABASE_CTX_KEY, db);
            ctx.next();
        }
    }

    /**
     * Extract the evaluation request POST-ed into the eval handlers. Put the request into the
     * REQUEST_CTX_KEY request parameter.
     */
    private void extractEvaluationRequest(RoutingContext ctx) {
        var request = Json.decodeValue(ctx.getBody(), EvaluationRequest.class);
        ctx.put(REQUEST_CTX_KEY, request);
        ctx.next();
    }
}
