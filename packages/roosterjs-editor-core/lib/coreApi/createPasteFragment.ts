import {
    applyFormat,
    applyTextStyle,
    createDefaultHtmlSanitizerOptions,
    getPasteType,
    handleImagePaste,
    handleTextPaste,
    moveChildNodes,
    retrieveMetadataFromClipboard,
    sanitizePasteContent,
} from 'roosterjs-editor-dom';
import {
    BeforePasteEvent,
    ClipboardData,
    CreatePasteFragment,
    EditorCore,
    PluginEventType,
    NodePosition,
    PasteType,
    DefaultFormat,
} from 'roosterjs-editor-types';

/**
 * @internal
 * Create a DocumentFragment for paste from a ClipboardData
 * @param core The EditorCore object.
 * @param clipboardData Clipboard data retrieved from clipboard
 * @param position The position to paste to
 * @param pasteAsText True to force use plain text as the content to paste, false to choose HTML or Image if any
 * @param applyCurrentStyle True if apply format of current selection to the pasted content,
 * false to keep original format
 * @param pasteAsImage True if the image should be pasted as image
 */
export const createPasteFragment: CreatePasteFragment = (
    core: EditorCore,
    clipboardData: ClipboardData,
    position: NodePosition | null,
    pasteAsText: boolean,
    applyCurrentStyle: boolean,
    pasteAsImage: boolean = false
) => {
    if (!clipboardData) {
        return null;
    }

    const pasteType = getPasteType(pasteAsText, applyCurrentStyle, pasteAsImage);

    // Step 1: Prepare BeforePasteEvent object
    const event = createBeforePasteEvent(core, clipboardData, pasteType);
    return createFragmentFromClipboardData(
        core,
        clipboardData,
        position,
        pasteAsText,
        applyCurrentStyle,
        pasteAsImage,
        event
    );
};

function createBeforePasteEvent(
    core: EditorCore,
    clipboardData: ClipboardData,
    pasteType: PasteType
): BeforePasteEvent {
    const options = createDefaultHtmlSanitizerOptions();

    // Remove "caret-color" style generated by Safari to make sure caret shows in right color after paste
    options.cssStyleCallbacks['caret-color'] = () => false;

    return {
        eventType: PluginEventType.BeforePaste,
        clipboardData,
        fragment: core.contentDiv.ownerDocument.createDocumentFragment(),
        sanitizingOption: options,
        htmlBefore: '',
        htmlAfter: '',
        htmlAttributes: {},
        pasteType: pasteType,
    };
}

/**
 * Create a DocumentFragment for paste from a ClipboardData
 * @param core The EditorCore object.
 * @param clipboardData Clipboard data retrieved from clipboard
 * @param position The position to paste to
 * @param pasteAsText True to force use plain text as the content to paste, false to choose HTML or Image if any
 * @param applyCurrentStyle True if apply format of current selection to the pasted content,
 * @param pasteAsImage Whether to force paste as image
 * @param event Event to trigger.
 * false to keep original format
 */
function createFragmentFromClipboardData(
    core: EditorCore,
    clipboardData: ClipboardData,
    position: NodePosition | null,
    pasteAsText: boolean,
    applyCurrentStyle: boolean,
    pasteAsImage: boolean,
    event: BeforePasteEvent
) {
    const { fragment } = event;
    const { rawHtml, text, imageDataUri } = clipboardData;
    let doc: Document | undefined = rawHtml
        ? new DOMParser().parseFromString(core.trustedHTMLHandler(rawHtml), 'text/html')
        : undefined;

    // Step 2: Retrieve Metadata from Html and the Html that was copied.
    retrieveMetadataFromClipboard(doc, event, core.trustedHTMLHandler);

    // Step 3: Fill the BeforePasteEvent object, especially the fragment for paste
    if ((pasteAsImage && imageDataUri) || (!pasteAsText && !text && imageDataUri)) {
        // Paste image
        handleImagePaste(imageDataUri, fragment);
    } else if (!pasteAsText && rawHtml && doc ? doc.body : false) {
        moveChildNodes(fragment, doc?.body);

        if (applyCurrentStyle && position) {
            const format = getCurrentFormat(core, position.node);
            applyTextStyle(fragment, node => applyFormat(node, format));
        }
    } else if (text) {
        // Paste text
        handleTextPaste(text, position, fragment);
    }

    // Step 4: Trigger BeforePasteEvent so that plugins can do proper change before paste
    core.api.triggerEvent(core, event, true /*broadcast*/);

    // Step 5. Sanitize the fragment before paste to make sure the content is safe
    sanitizePasteContent(event, position);

    return fragment;
}

function getCurrentFormat(core: EditorCore, node: Node): DefaultFormat {
    const pendableFormat = core.api.getPendableFormatState(core, true /** forceGetStateFromDOM*/);
    const styleBasedFormat = core.api.getStyleBasedFormatState(core, node);
    return {
        fontFamily: styleBasedFormat.fontName,
        fontSize: styleBasedFormat.fontSize,
        textColor: styleBasedFormat.textColor,
        backgroundColor: styleBasedFormat.backgroundColor,
        textColors: styleBasedFormat.textColors,
        backgroundColors: styleBasedFormat.backgroundColors,
        bold: pendableFormat.isBold,
        italic: pendableFormat.isItalic,
        underline: pendableFormat.isUnderline,
    };
}
