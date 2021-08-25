import _forEach from 'lodash/forEach';
import _assign from 'lodash/assign';
import _last from 'lodash/last';
import _isNumber from 'lodash/isNumber';
import _map from 'lodash/map';
import _filter from 'lodash/filter';
import _uniq from 'lodash/uniq';
import _cloneDeep from 'lodash/cloneDeep';

import {IObject} from '../gInterface';

import Action from '../mask/gAction';
import ActionClear from '../mask/gActionClear';

import {ILayerStyle} from './gInterface';
import CanvasLayer from './gLayerCanvas';
import MaskHelperLayer from './gLayerMaskHelper';
import {ELayerType} from './gEnum';
import {EMaskActionType} from '../mask/gEnum';
import {IRectShape} from '../feature/gInterface';

export default class MaskLayer extends CanvasLayer  {
    public actions: Action[] = [] // 当前maskLayer中所有的actions

    // 临时clearAction对象【内部使用变量】
    public movingClearAction: ActionClear

    // function: constructor
    constructor(id: string, props: IObject = {}, style: ILayerStyle = {}) {
        super(id, ELayerType.Mask, props, style);
    }

    // 添加action至当前ActionLayer中
    addAction(action: Action, option?: IObject) {
        action.onAdd(this);
        this.actions.push(action);
    }

    // 删除action
    removeActionById(targetActionId: string) {
        const newActions = _filter(this.actions, (action: Action) => {
            const actionId = action.id;
            if (actionId === targetActionId) {
                action.onRemove();
                return false;
            }
            return true;
        });
        // 重新设置最新的actions
        this.actions = newActions;
        // 执行重绘刷新
        this.refresh();
    }

    // 删除所有actions
    removeAllActions() {
        const newActions = _filter(this.actions, (action: Action) => {
            action.onRemove();
            return false;
        });
        // 重新设置最新的actions
        this.actions = newActions;
        // 执行重绘刷新
        this.refresh();
    }

    // 内部方法
    // 在橡皮擦擦除时添加临时clearAction
    // 此action并非实际真正action, 不会被记录到this.actions中
    setMovingClearAction(clearAction: ActionClear | null) {
        clearAction && clearAction.onAdd(this);
        this.movingClearAction = clearAction;
        this.refresh();
    }

    // 获取当前layer上所有category分类
    getActionCategories() {
        const actions = this.actions;
        const categories = _map(actions, ({category}) => category);
        // 去重之后，然后去除clearAction对应的category=undefined的情况
        return _filter(_uniq(categories), category => !!category);
    }
    // 根action.category进行分组
    groupByCategory() {
        const actions = this.actions;
        const categories = this.getActionCategories();
        const groups = [];
        _forEach(categories, cat => {
            const mappedActions = _filter(actions, ({type, category}) => (category === cat || type === EMaskActionType.Clear));
            groups.push({category: cat, actions: mappedActions});
        })
        return groups;
    }

    // 获取指定group的rleData
    getGroupRleData(group, bounds: IRectShape) {
        const {category, actions = []} = group;
        const maskLayerHelper = new MaskHelperLayer(bounds);
        const copyActions = _cloneDeep(actions);
        maskLayerHelper.addActions(copyActions);
        const rle = maskLayerHelper.getRle();
        return {category, rle};
    }

    // 根据分类获取分类分类rle数据, 截取某个范围的数据
    getRleData(bounds: IRectShape) {
        const groups = this.groupByCategory();
        const rles = []; // 所有category的rle数据集合
        _forEach(groups, group => {
            const rle = this.getGroupRleData(group, bounds);
            rles.push(rle);
        });
        return rles;
    }

    // @override
    refresh() {
        super.refresh();

        // 绘制actions中所有action对象
        _forEach(this.actions, (action: Action) => action.refresh());
        // 判断是否存在movingClearAction，如果存在，也需要执行绘制
        this.movingClearAction && this.movingClearAction.refresh();
    }
}
