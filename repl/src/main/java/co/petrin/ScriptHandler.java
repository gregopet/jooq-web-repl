package co.petrin;

import co.petrin.function.TriFunction;
import io.vertx.core.Vertx;
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
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.toList;

/**
 * Lists available databases and executes code on them.
 */
public class ScriptHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ScriptHandler.class);
    private static final Logger SCRIPT_LOG = LoggerFactory.getLogger("script.eval");

    /** Maximum length of scripts incoming in request bodies in bytes */
    private static long BODY_SIZE_LIMIT = 100_000; // is this enough?

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
        router.get().handler(this::listDatabases);
        registerNoDatabasePostHandler(router, "eval", (evaluator, req) -> {
            if (SCRIPT_LOG.isInfoEnabled()) {
                SCRIPT_LOG.info("Evaluating script (without a database): " + req.getScript());
            }
            return evaluator.evaluate(null, req);
        });
        registerNoDatabasePostHandler(router, "suggest", (evaluator, req) -> evaluator.suggest(null, req));
        registerNoDatabasePostHandler(router, "javadoc", (evaluator, req) -> evaluator.javadoc(null, req));
        registerDatabasePostHandler(router, "eval", (evaluator, db, req) -> {
            if (SCRIPT_LOG.isInfoEnabled()) {
                SCRIPT_LOG.info("Evaluating script (on database " + db + "): " + req.getScript());
            }
            return evaluator.evaluate(db, req);
        });
        registerDatabasePostHandler(router, "suggest", (evaluator, db, req) -> evaluator.suggest(db, req));
        registerDatabasePostHandler(router, "javadoc", (evaluator, db, req) -> evaluator.javadoc(db, req));
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
     * Registers a router path to which we can POST an EvaluationRequest payload that is supposed to run on a database
     * and respond with any JSON payload.
     * The registered routes will be of the form /{databaseId}/{operation}
     *
     * @param router The router instance on which to register the handlers
     * @param operation The operation-specific path segment that follows the database number.
     */
    private void registerDatabasePostHandler(Router router, String operation, TriFunction<Evaluator, Database, EvaluationRequest, Object> handler) {
        router.postWithRegex("/([0-9]{1,3})/" + operation).handler(BodyHandler.create().setBodyLimit(BODY_SIZE_LIMIT)).blockingHandler( rc -> {
            try {
                var dbId = Integer.parseInt(rc.request().getParam("param0"));
                var db = databases.stream()
                        .filter(dbConfig -> dbConfig.id == dbId).findAny()
                        .orElseThrow(() -> new IllegalArgumentException("Database with id " + dbId + " could not be found!"));
                var request = Json.decodeValue(rc.getBody(), EvaluationRequest.class);
                var evaluator = getEvaluator();
                rc.response().closeHandler(h -> evaluator.stop() );
                var response = handler.apply(evaluator, db, request);
                int returnStatus = 200;
                if (response instanceof EvaluationResponse && ((EvaluationResponse) response).isError()) {
                    returnStatus = 400;
                }
                rc.response().setStatusCode(returnStatus).putHeader("content-type", "application/json; charset=UTF-8").end(Json.encodePrettily(response));
            } catch (Throwable t) {
                rc.response().setStatusCode(500).end("Evaluation caused an unexpected error of type " + t.getClass().getName());
            }
            prepareEvaluator();
        });
    }

    /**
     * Registers a router path to which we can POST an EvaluationRequest payload and respond with any JSON payload.
     * The registered routes will be of the form /{operation}
     *
     * @param router The router instance on which to register the handlers
     * @param operation The path on which this handler should be registered
     */
    private void registerNoDatabasePostHandler(Router router, String operation, BiFunction<Evaluator, EvaluationRequest, Object> handler) {
        router.postWithRegex("/" + operation).handler(BodyHandler.create().setBodyLimit(BODY_SIZE_LIMIT)).blockingHandler( rc -> {
            try {
                var request = Json.decodeValue(rc.getBody(), EvaluationRequest.class);
                var evaluator = getEvaluator();
                rc.response().closeHandler(h -> evaluator.stop());
                var response = handler.apply(evaluator, request);
                rc.response().putHeader("content-type", "application/json; charset=UTF-8").end(Json.encodePrettily(response));
            } catch (Throwable t) {
                rc.response().setStatusCode(500).end("Evaluation caused an unexpected error of type " + t.getClass().getName());
            }
            prepareEvaluator();
        });
    }

    private Evaluator getEvaluator() {
        return Objects.requireNonNullElseGet(evaluators.poll(), this::createEvaluator);
    }

    /**
     * Creates the evaluator to run for a certain request.
     * @return A constructed evaluator.
     */
    private Evaluator createEvaluator() {
        System.out.println("Creating an evaluator");
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

}
