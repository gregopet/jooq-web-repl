package co.petrin;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import org.jooq.Constants;
import org.jooq.tools.StringUtils;

/** A database connection descriptor */
public class Database {

    /** An arbitrary ID used to differentiate between database connections. Unique in a single run. */
    public final int id;

    /** The connection string to use to connect to the database */
    public final String connectionString;

    /** The description to display for this database */
    public final String description;

    /** Username to use when connecting */
    public final String user;

    /** Password to use when connecting */
    public final String password;

    /** A text that will automatically be inserted before any user script, for e.g. imports */
    public final String scriptPrefix;

    /**
     * A sandboxing host specification. Hosts and ports cannot be reliably parsed from an arbitrary DB connection string
     * so they need to be provided separately in case sandboxing will be used.
     * @see java.net.SocketPermission
     */
    public final String sandboxingHostAndPort;

    private static final String CONFIGURATION_PREFIX = "DATABASE_";
    private static final AtomicInteger idSequence = new AtomicInteger();

    public Database(String connectionString, String description, String user, String password, String scriptPrefix, String sandboxingHostAndPort) {
        this.id = idSequence.getAndIncrement();
        this.connectionString = connectionString;
        this.description = StringUtils.defaultIfNull(description, "");
        this.user = user;
        this.password = password;
        this.scriptPrefix = scriptPrefix;
        this.sandboxingHostAndPort = sandboxingHostAndPort;
    }

    /** Parse available databases from the environment settings */
    public static List<Database> parseFromEnvironment() {
        return System
            .getenv()
            .keySet()
            .stream()
            .filter(key -> key.startsWith(CONFIGURATION_PREFIX) && key.endsWith("_URL"))
            .map(key -> key.substring(CONFIGURATION_PREFIX.length(), key.length() - 4))
            .map( dbName -> new Database(
                System.getenv(CONFIGURATION_PREFIX + dbName + "_URL"),
                System.getenv(CONFIGURATION_PREFIX + dbName + "_DESCRIPTION"),
                System.getenv(CONFIGURATION_PREFIX + dbName + "_USER"),
                System.getenv(CONFIGURATION_PREFIX + dbName + "_PASSWORD"),
                System.getenv(CONFIGURATION_PREFIX + dbName + "_SCRIPT_PREFIX"),
                System.getenv(CONFIGURATION_PREFIX + dbName + "_SANDBOXING_HOST_AND_PORT")
            ))
            .collect(Collectors.toList());
    }

    /** Expose the jOOQ version to the outside */
    public static String getJooqVersion() {
        return Constants.VERSION;
    }

    @Override
    public String toString() {
        var sb = new StringBuilder();
        if (description != null && !description.isBlank()) {
            sb.append("Database '").append(description).append("'");
        } else {
            sb.append("Unnamed database");
        }
        sb.append(" @ ").append(connectionString);
        return sb.toString();
    }
}
