import Intention from "./Intention.js";

class Agent {

    intention_queue = new Array();

    async intentionLoop() {
        while (true) {
            const intention = this.intention_queue.shift();
            if (intention)
                await intention.achieve();
            else
                this.queue('random_move', {});
            
            await new Promise(res => setImmediate(res));
        }
    }

    async queue(desire, ...args) {
        const current = new Intention(desire,"", ...args)
        this.intention_queue.push(current);
    }

    async stop() {
        console.log('stop agent queued intentions');
        for (const intention of this.intention_queue) {
            intention.stop();
        }
    }

}

export default Agent;