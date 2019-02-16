package co.petrin;

import io.vertx.core.Vertx;
import io.vertx.core.VertxOptions;
import io.vertx.core.file.FileSystemOptions;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.BodyHandler;
import io.vertx.ext.web.handler.StaticHandler;

import java.util.List;
import java.util.stream.Collectors;

public class WebInterface {

    private static final Logger LOG = LoggerFactory.getLogger(WebInterface.class);

    /** Maximum length of scripts incoming in request bodies in bytes */
    private static long BODY_SIZE_LIMIT = 100_000; // is this enough?

    public static void main(String[] args) {
        Vertx vertx = Vertx.vertx(
            new VertxOptions()
                .setFileSystemOptions(new FileSystemOptions().setFileCachingEnabled(false).setClassPathResolvingEnabled(false)) //allow dev reloading
        );

        final var databases = Database.parseFromEnvironment();
        if (databases.isEmpty()) {
            LOG.warn("No databases were found!");
        } else {
            LOG.info("Found " + databases.size() + " databases:");
            for (var db : databases) {
                LOG.info("  " + db.toString());
            }
        }
        final String databaseJson = getDatabasesJson(databases);


        Router router = Router.router(vertx);
        router.get("/databases").handler(rc -> rc.response().putHeader("Content-Type", "application/json").end(databaseJson));
        router.post("/eval").handler(BodyHandler.create().setBodyLimit(BODY_SIZE_LIMIT)).handler(new ScriptHandler());
        router.route("/*").handler(
            StaticHandler.create()
                .setFilesReadOnly(false).setWebRoot("src/main/resources/webroot") // allow dev reloading
        );

        vertx
        .createHttpServer()
        .requestHandler(router)
        .listen(8080, handler -> {
            if (handler.succeeded()) {
                LOG.info("Server running on port 8080");
            } else {
                LOG.error("Failed to listen on port 8080");
            }
        });
    }

    private static String getDatabasesJson(List<Database> databaseList) {
        return new JsonObject(
            databaseList.stream()
            .collect(Collectors.toMap(db -> Integer.toString(db.id), db -> db.description))
        ).toString();
    }
}
