class Msg {
    constructor() {
        this.header = undefined;
        this.content = undefined;
        this.senderInfo = undefined;
    }

    setHeader(header) {
        this.header = header;
    }

    setContent(content) {
        this.content = content;
    }

    setSenderInfo({x: x, y: y, points: points}) {
        this.senderInfo = {x: x, y: y, points: points};
    }
}

export default Msg;