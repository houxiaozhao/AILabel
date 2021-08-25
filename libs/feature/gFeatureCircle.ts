import _isNumber from 'lodash/isNumber';
import _assign from 'lodash/assign';

import {IObject, IPoint} from '../gInterface';
import {IFeatureStyle, ICircleShape, IRectShape} from './gInterface';
import {EFeatureCircleSubtype, EFeatureType} from './gEnum';
import Feature from './gFeature';
import Graphic from '../gGraphic';
import CanvasLayer from '../layer/gLayerCanvas';
import Util from '../gUtil';

export default class CircleFeature extends Feature {
    static defaultOption: IObject = {
        active: false // 是否绘制选中态，默认不是选中态【内部使用/内部使用/内部使用】
    }
    // PointFeature附件选项，附加字段
    public option: IObject = {}

    // function: constructor
    constructor(id: string, shape: ICircleShape, props: IObject = {}, style: IFeatureStyle = {}, option?: IObject) {
        super(id, EFeatureType.Circle, props, style);

        this.shape = shape;
        this.option = _assign({}, CircleFeature.defaultOption, option || {});
    }

    // 根据shape设置subtype属性
    getSubType(): EFeatureCircleSubtype {
        const {r, sr} = this.shape as ICircleShape;
        if (_isNumber(r)) {
            return EFeatureCircleSubtype.Global;
        }
        else if (_isNumber(sr)) {
            return EFeatureCircleSubtype.Screen;
        }
    }

    // @override
    // 判断是否捕捉到当前对象，各子类自行实现
    captureWithPoint(point: IPoint): boolean {
        const isGlobalSubtype = this.getSubType() === EFeatureCircleSubtype.Global;
        const isScreenSubtype = this.getSubType() === EFeatureCircleSubtype.Screen;

        const {cx, cy, r, sr} = this.shape as ICircleShape;
        const mapScale = this.layer?.map?.getScale();
        const buffer = mapScale ? 3 / mapScale : 0;
        const tolerance = isGlobalSubtype ? (r + buffer) : (isScreenSubtype ? (sr / mapScale + buffer) : buffer);
        return Util.MathUtil.pointInPoint(point, {x: cx, y: cy}, {tolerance});
    }

    // // @override
    // // 获取最小外接矩形
    // getBounds(): IRectShape {
    //     const isGlobalSubtype = this.getSubType() === EFeatureCircleSubtype.Global;
    //     const {cx, cy, r, sr} = this.shape as ICircleShape;
    //     const radius = isGlobalSubtype ? r : (_isNumber(sr) ? sr : 0);
    //     const width = radius * 2;
    //     const height = radius * 2;
    // }

    // 获取4个边界点：如果用户传入的是sr屏幕半径坐标，则返回的点集会随视野变化发生变化
    getEdgePoints(): IPoint[] {
        const isGlobalSubtype = this.getSubType() === EFeatureCircleSubtype.Global;
        const isScreenSubtype = this.getSubType() === EFeatureCircleSubtype.Screen;

        const {cx, cy, r, sr} = this.shape as ICircleShape;
        const radius = isGlobalSubtype ? r : (isScreenSubtype ? sr : 0);
        const halfRadius = Math.sqrt(radius * radius / 2);

        if (isGlobalSubtype) {
            return [
                {x: cx - halfRadius, y: cy + halfRadius}, // 左上
                {x: cx + halfRadius, y: cy + halfRadius}, // 右上
                {x: cx + halfRadius, y: cy - halfRadius}, // 右下
                {x: cx - halfRadius, y: cy - halfRadius} // 左下
            ];
        }
        else if (isScreenSubtype) {
            const scale = this.layer?.map?.getScale();
            if (!scale) {
                console.error('circle getEdgePoints error: no added to layer or map');
                return [];
            }
            const globalRadius = halfRadius / scale;
            return [
                {x: cx - globalRadius, y: cy + globalRadius}, // 左上
                {x: cx + globalRadius, y: cy + globalRadius}, // 右上
                {x: cx + globalRadius, y: cy - globalRadius}, // 右下
                {x: cx - globalRadius, y: cy - globalRadius} // 左下
            ];
        }
        else {
            console.error('circle getEdgePoints error: no valid radius');
            return [];
        }
    }

    // 执行绘制当前
    // @override
    refresh() {
        const isGlobalSubtype = this.getSubType() === EFeatureCircleSubtype.Global;

        // 执行坐标转换
        const {stroke = true, fill = false} = this.shape as ICircleShape;

        const dpr = CanvasLayer.dpr;
        const scale = this.layer.map.getScale();

        Graphic.drawCircle(
            this.layer.canvasContext,
            this.shape as ICircleShape,
            this.style, // style
            {
                format: shape => {
                    const {cx, cy, r, sr} = shape;
                    const screenWidth = isGlobalSubtype
                        ? r * scale
                        : (_isNumber(sr) ? sr : 2);
                    const {x: globalX, y: globalY} = this.layer.map.transformGlobalToScreen({x: cx, y: cy});
                    return {
                        cx: globalX * dpr,
                        cy: globalY * dpr,
                        r: screenWidth * dpr
                    };
                },
                stroke,
                fill
            }
        );
    }
}
