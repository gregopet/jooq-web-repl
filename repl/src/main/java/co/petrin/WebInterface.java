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

    public static void main(String[] args) {
        Vertx vertx = Vertx.vertx(
            new VertxOptions()
                .setFileSystemOptions(new FileSystemOptions().setFileCachingEnabled(false).setClassPathResolvingEnabled(false)) //allow dev reloading
        );

        var router = Router.router(vertx);
        router.mountSubRouter("/databases", new ScriptHandler().getRouter(vertx));

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
}
