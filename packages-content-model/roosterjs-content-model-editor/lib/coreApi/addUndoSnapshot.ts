import { convertDomSelectionToMetadata } from '../editor/utils/selectionConverter';
import { PluginEventType } from 'roosterjs-editor-types';
import { Position } from 'roosterjs-editor-dom';
import type { EntityState, ContentChangedEvent } from 'roosterjs-editor-types';
import type { AddUndoSnapshot, StandaloneEditorCore } from 'roosterjs-content-model-types';

/**
 * @internal
 * Call an editing callback with adding undo snapshots around, and trigger a ContentChanged event if change source is specified.
 * Undo snapshot will not be added if this call is nested inside another addUndoSnapshot() call.
 * @param core The StandaloneEditorCore object
 * @param callback The editing callback, accepting current selection start and end position, returns an optional object used as the data field of ContentChangedEvent.
 * @param changeSource The ChangeSource string of ContentChangedEvent. @default ChangeSource.Format. Set to null to avoid triggering ContentChangedEvent
 * @param canUndoByBackspace True if this action can be undone when user press Backspace key (aka Auto Complete).
 * @param additionalData @optional parameter to provide additional data related to the ContentChanged Event.
 */
export const addUndoSnapshot: AddUndoSnapshot = (
    core,
    callback,
    changeSource,
    canUndoByBackspace,
    additionalData
) => {
    const undoState = core.undo;
    const isNested = undoState.isNested;
    let data: any;

    if (!isNested) {
        undoState.isNested = true;

        // When there is getEntityState, it means this is triggered by an entity change.
        // So if HTML content is not changed (hasNewContent is false), no need to add another snapshot before change
        if (core.undo.hasNewContent || !additionalData?.getEntityState || !callback) {
            addUndoSnapshotInternal(core, canUndoByBackspace, additionalData?.getEntityState?.());
        }
    }

    try {
        if (callback) {
            const selection = core.api.getDOMSelection(core);
            const range = selection?.type == 'range' ? selection.range : null;
            data = callback(
                range && Position.getStart(range).normalize(),
                range && Position.getEnd(range).normalize()
            );

            if (!isNested) {
                const entityStates = additionalData?.getEntityState?.();
                addUndoSnapshotInternal(core, false /*isAutoCompleteSnapshot*/, entityStates);
            }
        }
    } finally {
        if (!isNested) {
            undoState.isNested = false;
        }
    }

    if (callback && changeSource) {
        const event: ContentChangedEvent = {
            eventType: PluginEventType.ContentChanged,
            source: changeSource,
            data: data,
            additionalData,
        };
        core.api.triggerEvent(core, event, true /*broadcast*/);
    }

    if (canUndoByBackspace) {
        const selection = core.api.getDOMSelection(core);

        if (selection?.type == 'range') {
            core.undo.hasNewContent = false;
            core.undo.posContainer = selection.range.startContainer;
            core.undo.posOffset = selection.range.startOffset;
        }
    }
};

function addUndoSnapshotInternal(
    core: StandaloneEditorCore,
    canUndoByBackspace: boolean,
    entityStates?: EntityState[]
) {
    if (!core.lifecycle.shadowEditFragment) {
        const selection = core.api.getDOMSelection(core);
        const metadata = convertDomSelectionToMetadata(core.contentDiv, selection);

        if (metadata) {
            metadata.isDarkMode = !!core.lifecycle.isDarkMode;
        }

        core.undo.snapshotsService.addSnapshot(
            {
                html: core.contentDiv.innerHTML,
                metadata,
                knownColors: core.darkColorHandler?.getKnownColorsCopy() || [],
                entityStates,
            },
            canUndoByBackspace
        );
        core.undo.hasNewContent = false;
    }
}
