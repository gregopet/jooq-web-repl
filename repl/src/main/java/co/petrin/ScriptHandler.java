package co.petrin;

import io.vertx.core.Vertx;
import io.vertx.core.json.Json;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.RoutingContext;
import io.vertx.ext.web.handler.BodyHandler;

import java.util.List;
import java.util.function.BiConsumer;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Lists available databases and executes code on them.
 */
public class ScriptHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ScriptHandler.class);

    /** Maximum length of scripts incoming in request bodies in bytes */
    private static long BODY_SIZE_LIMIT = 100_000; // is this enough?

    /** All the configured databases, read on instantiation form environment variables */
    private final List<Database> databases;

    /** The database list in JSON form for sending down to clients */
    private final String databasesJson;

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
        registerNoDatabasePostHandler(router, "eval", (req) -> new Evaluator().evaluate(null, req));
        registerNoDatabasePostHandler(router, "suggest", (req) -> new Evaluator().suggest(null, req));
        registerNoDatabasePostHandler(router, "javadoc", (req) -> new Evaluator().javadoc(null, req));
        registerDatabasePostHandler(router, "eval", (db, req) -> new Evaluator().evaluate(db, req));
        registerDatabasePostHandler(router, "suggest", (db, req) -> new Evaluator().suggest(db, req));
        registerDatabasePostHandler(router, "javadoc", (db, req) -> new Evaluator().javadoc(db, req));
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
    private void registerDatabasePostHandler(Router router, String operation, BiFunction<Database, EvaluationRequest, Object> handler) {
        router.postWithRegex("/([0-9]{1,3})/" + operation).handler(BodyHandler.create().setBodyLimit(BODY_SIZE_LIMIT)).blockingHandler( rc -> {
            try {
                var dbId = Integer.parseInt(rc.request().getParam("param0"));
                var db = databases.stream()
                        .filter(dbConfig -> dbConfig.id == dbId).findAny()
                        .orElseThrow(() -> new IllegalArgumentException("Database with id " + dbId + " could not be found!"));
                var request = Json.decodeValue(rc.getBody(), EvaluationRequest.class);
                var response = handler.apply(db, request);
                int returnStatus = 200;
                if (response instanceof EvaluationResponse && ((EvaluationResponse) response).isError()) {
                    returnStatus = 400;
                }
                rc.response().setStatusCode(returnStatus).putHeader("content-type", "application/json; charset=UTF-8").end(Json.encodePrettily(response));
            } catch (Throwable t) {
                rc.response().setStatusCode(500).end("Evaluation caused an unexpected error of type " + t.getClass().getName());
            }
        });
    }

    /**
     * Registers a router path to which we can POST an EvaluationRequest payload and respond with any JSON payload.
     * The registered routes will be of the form /{operation}
     *
     * @param router The router instance on which to register the handlers
     * @param operation The path on which this handler should be registered
     */
    private void registerNoDatabasePostHandler(Router router, String operation, Function<EvaluationRequest, Object> handler) {
        router.postWithRegex("/" + operation).handler(BodyHandler.create().setBodyLimit(BODY_SIZE_LIMIT)).blockingHandler( rc -> {
            try {
                var request = Json.decodeValue(rc.getBody(), EvaluationRequest.class);
                var response = handler.apply(request);
                rc.response().putHeader("content-type", "application/json; charset=UTF-8").end(Json.encodePrettily(response));
            } catch (Throwable t) {
                rc.response().setStatusCode(500).end("Evaluation caused an unexpected error of type " + t.getClass().getName());
            }
        });
    }

}
