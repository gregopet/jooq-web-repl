package co.petrin;

/** An output augmented by an Augmentation */
public interface AugmentedOutput {

    /** A short, human-presentable name for this output, e.g. 'Grid 1' */
    String getName();

    /** The well-known format type downstream renderers can use to present the output. */
    String getType();

    /** The output of the evaluation */
    String getOutput();
}
