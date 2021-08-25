import _forEach from 'lodash/forEach';
import _get from 'lodash/get';
import _filter from 'lodash/filter';

import Text from '../text/gText';

import {IObject} from '../gInterface';
import {ILayerStyle, ITextAddOption} from './gInterface';
import CanvasLayer from './gLayerCanvas';
import {ELayerType} from './gEnum';

export default class TextLayer extends CanvasLayer  {
    public texts: Text[] = [] // 当前textLayer中所有的texts

    // function: constructor
    constructor(id: string, props: IObject = {}, style: ILayerStyle = {}) {
        super(id, ELayerType.Text, props, style);
    }

    addText(text: Text, option?: ITextAddOption) {
        const {clear = false} = option || {};
        clear && this.clear();

        text.onAdd(this);
        this.texts.push(text);
    }

    // 删除text
    removeTextById(targetTextId: string) {
        const newTexts = _filter(this.texts, (text: Text) => {
            const textId = text.id;
            if (textId === targetTextId) {
                text.onRemove();
                return false;
            }
            return true;
        });
        // 重新设置最新的texts
        this.texts = newTexts;
        // 执行重绘刷新
        this.refresh();
    }

    // 删除所有texts
    removeAllTexts() {
        const newTexts = _filter(this.texts, (text: Text) => {
            text.onRemove();
            return false;
        });
        // 重新设置最新的texts
        this.texts = newTexts;
        // 执行重绘刷新
        this.refresh();
    }

    // @override
    refresh() {
        super.refresh();
        _forEach(this.texts, (text: Text) => text.refresh());
    }
}
