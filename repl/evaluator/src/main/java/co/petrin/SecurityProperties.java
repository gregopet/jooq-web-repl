package co.petrin;

import java.io.IOException;
import java.lang.reflect.ReflectPermission;
import java.net.SocketPermission;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.AllPermission;
import java.security.Permission;
import java.util.List;
import java.util.PropertyPermission;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Creates security property files for sandboxing remote processes.
 */
public class SecurityProperties {

    private static ConcurrentHashMap<String, Path> cachedSecurityFiles = new ConcurrentHashMap<>();

    /**
     * Creates a security file and returns its path
     * @param allowedHosts The host:port specifications of where our databases are located so connections to then are
     *                     allowed under the security policy.
     */
    public static Path getPath(List<String> allowedHosts) throws IOException {
        final String properties = createProperties(allowedHosts);
        final Path filePath = fromCacheOrDisk(properties);
        //System.out.println(filePath);
        return filePath;
    }

    /** Creates the contents of an appropriate .properties security file */
    private static String createProperties(List<String> allowedHosts) throws IOException {
        var propertiesBuilder = new StringBuilder(200);
        allowJShell(propertiesBuilder);
        allowJooq(propertiesBuilder);
        if (allowedHosts != null) {
            var iter = allowedHosts.iterator();
            while (iter.hasNext()) {
                allowSocket(propertiesBuilder, iter.next());
            }
        }
        return propertiesBuilder.toString();
    }

    /** Checks to see if we have an identical permissions file cached already */
    private static Path fromCacheOrDisk(String contents) throws IOException {
        return cachedSecurityFiles.compute(contents, (props, existing) -> {
            if (existing == null || !Files.exists(existing)) {
                try {
                    return saveProperties(props);
                } catch (IOException ex) {
                    throw new RuntimeException(ex);
                }
            } else {
                return existing;
            }
        });
    }

    private static Path saveProperties(String content) throws IOException {
        var tempFile = Files.createTempFile("co.petrin.Evaluator.securityPolicy-", ".properties");
        Files.writeString(tempFile, content);
        return tempFile;
    }

    private static void allowJShell(StringBuilder writer) throws IOException {
        // https://stackoverflow.com/questions/57663086/how-to-create-jshell-programmatically-when-securitymanager-is-set
        grant(writer, "jrt:/jdk.jshell", new AllPermission());
        grant(writer, "jrt:/jdk.jdi", new AllPermission());
        grant(writer, "jrt:/jdk.compiler", new AllPermission());
    }

    private static void allowJooq(StringBuilder writer) throws IOException {
        grant(writer, null,
            new PropertyPermission("org.jooq.*", "read"),
            new ReflectPermission("newProxyInPackage.org.jooq.impl")
        );
    }

    private static void allowSocket(StringBuilder writer, String host) throws IOException {
        grant(writer, null,
            new SocketPermission(host, "connect,resolve,accept")
        );
    }

    private static void grant(StringBuilder writer, String codeBase, Permission... permissions) throws IOException {
        writer.append("grant ");
        if (codeBase != null) {
            writer.append("codeBase ");
            writer.append("\"");
            writer.append(codeBase);
            writer.append("\"");
        }
        writer.append(" {");
        for (int a = 0; a < permissions.length; a++) {
            writer.append("\n");
            writer.append("   permission ");
            writer.append(permissions[a].getClass().getCanonicalName());
            if (permissions[a].getName() != null) {
                writer.append(" \"");
                writer.append(permissions[a].getName());
                writer.append("\",\"");
                writer.append(permissions[a].getActions());
                writer.append("\";");
            }
        }
        writer.append("\n");
        writer.append("};");
        writer.append("\n");
    }

}
