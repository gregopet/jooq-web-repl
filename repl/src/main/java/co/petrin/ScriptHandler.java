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
        router.postWithRegex("/([0-9]{1,3})/eval").handler(BodyHandler.create().setBodyLimit(BODY_SIZE_LIMIT)).blockingHandler( rc -> {
            var dbId = Integer.parseInt(rc.request().getParam("param0"));
            var db = databases.stream()
                .filter( dbConfig -> dbConfig.id == dbId ).findAny()
                .orElseThrow(()-> new IllegalArgumentException("Database with id " + dbId + " could not be found!"));
            eval(db, rc);
        });
        router.postWithRegex("/([0-9]{1,3})/suggest").handler(BodyHandler.create().setBodyLimit(BODY_SIZE_LIMIT)).blockingHandler( rc -> {
            var request = Json.decodeValue(rc.getBody(), EvaluationRequest.class);
            var suggestions = new Evaluator().suggest(request);
            rc.response().putHeader("content-type", "application/json; charset=UTF-8").end(Json.encodePrettily(suggestions));
        });
        router.postWithRegex("/([0-9]{1,3})/javadoc").handler(BodyHandler.create().setBodyLimit(BODY_SIZE_LIMIT)).blockingHandler( rc -> {
            var request = Json.decodeValue(rc.getBody(), EvaluationRequest.class);
            var suggestions = new Evaluator().javadoc(request);
            rc.response().putHeader("content-type", "application/json; charset=UTF-8").end(Json.encodePrettily(suggestions));
        });
        return router;
    }

    private void eval(Database db, RoutingContext ctx) {
        Evaluator evaluator = new Evaluator();
        var request = Json.decodeValue(ctx.getBody(), EvaluationRequest.class);
        var result = evaluator.evaluate(db, request);
        ctx.response().putHeader("content-type", "application/json; charset=UTF-8").end(Json.encodePrettily(result));
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

}
