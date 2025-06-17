export type ColorTuple = [red: number, green: number, blue: number];

export class ColorUtil {
    public static namedToTuple(color: string): ColorTuple {
        let el = document.createElement("canvas").getContext("2d");
        el.fillStyle = color;

        return this.hexColorToTuple(el.fillStyle);
    }

    public static hexColorToTuple(color: string): ColorTuple {
        let regex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
        return [parseInt(regex[1], 16), parseInt(regex[2], 16), parseInt(regex[3], 16)];
    }

    public static colorTupleToHex(color: ColorTuple): string {
        return `#${this.numberToHex(color[0])}${this.numberToHex(color[1])}${this.numberToHex(color[2])}`;
    }

    public static scaleColorTuple(color: ColorTuple, oldMax: number = 255, newMax: number = 100) : ColorTuple {
        let scale = newMax / oldMax;
        return color.map(value => Math.round(value * scale)) as ColorTuple;
    }

    private static numberToHex(num: number): string {
        num &= 0xFF;
        return num.toString(16).padStart(2, "0");
    }
}