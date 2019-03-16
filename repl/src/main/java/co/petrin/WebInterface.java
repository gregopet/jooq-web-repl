package co.petrin;

import io.vertx.core.Vertx;
import io.vertx.core.VertxOptions;
import io.vertx.core.file.FileSystemOptions;
import io.vertx.core.http.HttpMethod;
import io.vertx.core.http.HttpServerOptions;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.BodyHandler;
import io.vertx.ext.web.handler.CSRFHandler;
import io.vertx.ext.web.handler.CookieHandler;
import io.vertx.ext.web.handler.StaticHandler;
import org.apache.commons.lang3.StringUtils;

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

        if (System.getenv("REPL_CSRF_SECRET") != null) {
            // CSRF protection for /database (to protect POST requests) and / (to set the required cookies)
            router.route().handler(CookieHandler.create()); //required for CSRF protection to work!
            var csrfHandler = CSRFHandler.create(System.getenv("REPL_CSRF_SECRET"))
                .setCookieName("X-CSRF")
                .setCookiePath("/")
                .setHeaderName("X-CSRF-TOKEN")
                .setNagHttps(false);
            router.routeWithRegex(HttpMethod.POST, "/databases/.*").handler(csrfHandler);
            router.route(HttpMethod.GET, "/").handler(csrfHandler);
        }

        router.mountSubRouter("/databases", new ScriptHandler().getRouter(vertx));

        router.route("/*").handler(
            StaticHandler.create()
                .setFilesReadOnly(false).setWebRoot("src/main/resources/webroot") // allow dev reloading
        );

        final int port;
        String portConfig = System.getenv("REPL_PORT");
        if (StringUtils.isNumeric(portConfig)) {
            port = Integer.parseInt(portConfig);
        } else {
            port = 8080;
        }

        vertx
        .createHttpServer(
            new HttpServerOptions()
                .setCompressionSupported(true) // this might actually be harmful when fronting with a good native server?
        )
        .requestHandler(router)
        .listen(port, handler -> {
            if (handler.succeeded()) {
                LOG.info("jOOQ REPL is running on port " + port);
            } else {
                LOG.error("Failed to listen on port " + port);
            }
        });
    }
}
