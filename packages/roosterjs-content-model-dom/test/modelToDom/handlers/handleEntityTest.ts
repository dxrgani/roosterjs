import * as entityUtils from '../../../lib/domUtils/entityUtils';
import { ContentModelEntity, ModelToDomContext } from 'roosterjs-content-model-types';
import { createModelToDomContext } from '../../../lib/modelToDom/context/createModelToDomContext';
import { itChromeOnly } from '../../testUtils';
import {
    handleEntityBlock,
    handleEntitySegment,
} from '../../../lib/modelToDom/handlers/handleEntity';

describe('handleEntity', () => {
    let context: ModelToDomContext;

    beforeEach(() => {
        context = createModelToDomContext({
            allowCacheElement: true,
        });
        spyOn(entityUtils, 'addDelimiters').and.callThrough();
    });

    it('Simple block entity', () => {
        const div = document.createElement('div');
        const entityModel: ContentModelEntity = {
            blockType: 'Entity',
            segmentType: 'Entity',
            format: {},
            entityFormat: {
                id: 'entity_1',
                entityType: 'entity',
                isReadonly: true,
            },
            wrapper: div,
        };

        const parent = document.createElement('div');

        context.addDelimiterForEntity = false;
        handleEntityBlock(document, parent, entityModel, context, null);

        expect(parent.innerHTML).toBe(
            '<div class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false"></div>'
        );
        expect(div.outerHTML).toBe(
            '<div class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false"></div>'
        );
        expect(entityUtils.addDelimiters).toHaveBeenCalledTimes(0);
    });

    itChromeOnly('Block entity with display: inline-block & width: 100%', () => {
        const div = document.createElement('div');
        div.style.display = 'inline-block';
        div.style.width = '100%';

        const entityModel: ContentModelEntity = {
            blockType: 'Entity',
            segmentType: 'Entity',
            format: {},
            entityFormat: {
                id: 'entity_1',
                entityType: 'entity',
                isReadonly: true,
            },
            wrapper: div,
        };

        const parent = document.createElement('div');

        context.addDelimiterForEntity = true;
        handleEntityBlock(document, parent, entityModel, context, null);

        expect(parent.innerHTML).toBe(
            '<div class="_E_EBlockEntityContainer"><span class="entityDelimiterBefore">​</span><div class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false" style="display: inline-block; width: 100%;"></div><span class="entityDelimiterAfter">​</span></div>'
        );
        expect(div.outerHTML).toBe(
            '<div class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false" style="display: inline-block; width: 100%;"></div>'
        );
        expect(entityUtils.addDelimiters).toHaveBeenCalledTimes(1);
    });

    it('Fake entity', () => {
        const div = document.createElement('div');
        const entityModel: ContentModelEntity = {
            blockType: 'Entity',
            segmentType: 'Entity',
            format: {},
            wrapper: div,
            entityFormat: {
                isFakeEntity: true,
                isReadonly: false,
            },
        };

        div.textContent = 'test';

        const parent = document.createElement('div');

        handleEntityBlock(document, parent, entityModel, context, null);

        expect(parent.innerHTML).toBe('<div>test</div>');
        expect(div.outerHTML).toBe('<div>test</div>');
        expect(entityUtils.addDelimiters).toHaveBeenCalledTimes(0);
    });

    it('Readonly fake entity', () => {
        const div = document.createElement('div');
        const entityModel: ContentModelEntity = {
            blockType: 'Entity',
            segmentType: 'Entity',
            format: {},
            wrapper: div,
            entityFormat: {
                isFakeEntity: true,
                isReadonly: true,
            },
        };

        div.textContent = 'test';

        const parent = document.createElement('div');

        handleEntityBlock(document, parent, entityModel, context, null);

        expect(parent.innerHTML).toBe('<div contenteditable="false">test</div>');
        expect(div.outerHTML).toBe('<div contenteditable="false">test</div>');
        expect(entityUtils.addDelimiters).toHaveBeenCalledTimes(0);
    });

    it('Simple inline readonly entity', () => {
        const span = document.createElement('span');
        const entityModel: ContentModelEntity = {
            blockType: 'Entity',
            segmentType: 'Entity',
            format: {},
            entityFormat: {
                id: 'entity_1',
                entityType: 'entity',
                isReadonly: true,
            },
            wrapper: span,
        };

        const parent = document.createElement('div');
        context.addDelimiterForEntity = true;
        handleEntitySegment(document, parent, entityModel, context, []);

        expect(parent.innerHTML).toBe(
            '<span class="entityDelimiterBefore">​</span><span class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false"></span><span class="entityDelimiterAfter">​</span>'
        );
        expect(span.outerHTML).toBe(
            '<span class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false"></span>'
        );
        expect(entityUtils.addDelimiters).toHaveBeenCalledTimes(1);
    });

    it('Entity with refNode', () => {
        const div = document.createElement('div');
        const entityModel: ContentModelEntity = {
            blockType: 'Entity',
            segmentType: 'Entity',
            format: {},
            entityFormat: {
                id: 'entity_1',
                entityType: 'entity',
                isReadonly: true,
            },
            wrapper: div,
        };

        div.textContent = 'test';

        const parent = document.createElement('div');
        const br = document.createElement('br');
        parent.appendChild(br);

        const result = handleEntityBlock(document, parent, entityModel, context, br);

        expect(parent.innerHTML).toBe(
            '<div class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false">test</div><br>'
        );
        expect(div.outerHTML).toBe(
            '<div class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false">test</div>'
        );
        expect(result).toBe(br);
    });

    it('Entity is already there', () => {
        const br = document.createElement('br');
        const insertBefore = jasmine.createSpy('insertBefore');
        const parent = ({
            insertBefore,
        } as any) as HTMLElement;
        const entityDiv = ({
            nextSibling: br,
            parentNode: parent,
            style: {},
        } as any) as HTMLElement;
        const entityModel: ContentModelEntity = {
            blockType: 'Entity',
            segmentType: 'Entity',
            format: {},
            entityFormat: {
                id: 'entity_1',
                entityType: 'entity',
                isReadonly: true,
            },
            wrapper: entityDiv,
        };

        entityDiv.textContent = 'test';

        const result = handleEntityBlock(document, parent, entityModel, context, entityDiv);

        expect(insertBefore).not.toHaveBeenCalled();
        expect(result).toBe(br);
    });

    it('Entity with delimiter', () => {
        const span = document.createElement('span');
        const entityModel: ContentModelEntity = {
            blockType: 'Entity',
            segmentType: 'Entity',
            format: {},
            entityFormat: {
                id: 'entity_1',
                entityType: 'entity',
                isReadonly: true,
            },
            wrapper: span,
        };

        span.textContent = 'test';

        const parent = document.createElement('div');
        const br = document.createElement('br');
        parent.appendChild(br);

        context.addDelimiterForEntity = true;

        handleEntitySegment(document, parent, entityModel, context, []);

        expect(parent.innerHTML).toBe(
            '<br><span class="entityDelimiterBefore">​</span><span class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false">test</span><span class="entityDelimiterAfter">​</span>'
        );
        expect(span.outerHTML).toBe(
            '<span class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false">test</span>'
        );
        expect(context.regularSelection.current.segment).toBe(span.nextSibling);
    });

    it('Entity without delimiter', () => {
        const span = document.createElement('span');
        const entityModel: ContentModelEntity = {
            blockType: 'Entity',
            segmentType: 'Entity',
            format: {},
            entityFormat: {
                id: 'entity_1',
                entityType: 'entity',
                isReadonly: true,
            },
            wrapper: span,
        };

        span.textContent = 'test';

        const parent = document.createElement('div');
        handleEntitySegment(document, parent, entityModel, context, []);

        expect(parent.innerHTML).toBe(
            '<span class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false">test</span>'
        );
        expect(span.outerHTML).toBe(
            '<span class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false">test</span>'
        );
        expect(context.regularSelection.current.segment).toBe(span);
    });

    it('With onNodeCreated', () => {
        const entityDiv = document.createElement('div');
        const entityModel: ContentModelEntity = {
            blockType: 'Entity',
            segmentType: 'Entity',
            format: {},
            entityFormat: {
                id: 'entity_1',
                entityType: 'entity',
                isReadonly: true,
            },
            wrapper: entityDiv,
        };

        const onNodeCreated = jasmine.createSpy('onNodeCreated');
        const parent = document.createElement('div');

        context.onNodeCreated = onNodeCreated;

        handleEntityBlock(document, parent, entityModel, context, null);

        expect(parent.innerHTML).toBe(
            '<div class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false"></div>'
        );
        expect(onNodeCreated.calls.argsFor(0)[0]).toBe(entityModel);
        expect(onNodeCreated.calls.argsFor(0)[1]).toBe(parent.querySelector('div'));
    });

    it('Inline entity with newSegments and delimiter', () => {
        const span = document.createElement('span');
        const entityModel: ContentModelEntity = {
            blockType: 'Entity',
            segmentType: 'Entity',
            format: {},
            entityFormat: {
                id: 'entity_1',
                entityType: 'entity',
                isReadonly: true,
            },
            wrapper: span,
        };

        const parent = document.createElement('div');
        const newSegments: Node[] = [];

        context.addDelimiterForEntity = true;
        handleEntitySegment(document, parent, entityModel, context, newSegments);

        expect(parent.innerHTML).toBe(
            '<span class="entityDelimiterBefore">​</span><span class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false"></span><span class="entityDelimiterAfter">​</span>'
        );
        expect(span.outerHTML).toBe(
            '<span class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false"></span>'
        );
        expect(entityUtils.addDelimiters).toHaveBeenCalledTimes(1);
        expect(newSegments.length).toBe(5);
        expect(newSegments[0]).toBe(span);
        expect(newSegments[1]).toBe(span.nextSibling!);
        expect(newSegments[2]).toBe(span.previousSibling!);
        expect(newSegments[3]).toBe(span.nextSibling!.firstChild!);
        expect(newSegments[4]).toBe(span.previousSibling!.firstChild!);
    });

    it('Inline entity with newSegments but no delimiter', () => {
        const span = document.createElement('span');
        const entityModel: ContentModelEntity = {
            blockType: 'Entity',
            segmentType: 'Entity',
            format: {},
            entityFormat: {
                id: 'entity_1',
                entityType: 'entity',
                isReadonly: true,
            },
            wrapper: span,
        };

        const parent = document.createElement('div');
        const newSegments: Node[] = [];

        context.addDelimiterForEntity = false;
        handleEntitySegment(document, parent, entityModel, context, newSegments);

        expect(parent.innerHTML).toBe(
            '<span class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false"></span>'
        );
        expect(span.outerHTML).toBe(
            '<span class="_Entity _EType_entity _EId_entity_1 _EReadonly_1" contenteditable="false"></span>'
        );
        expect(entityUtils.addDelimiters).toHaveBeenCalledTimes(0);
        expect(newSegments.length).toBe(1);
        expect(newSegments[0]).toBe(span);
    });
});
