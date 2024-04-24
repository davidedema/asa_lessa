import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import easystarjs from 'easystarjs'


const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA1OWJhYTIxYWRiIiwibmFtZSI6ImRhdmlkZSIsImlhdCI6MTcxMzk0MjYzM30.36QVErTGenPY5cnyuVNYyuX-mIe-G6tVCP6BC-mln9k'
)

function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const dx = Math.abs(Math.round(x1) - Math.round(x2))
    const dy = Math.abs(Math.round(y1) - Math.round(y2))
    return dx + dy;
}



/**
 * Belief revision function
 */

const me = { carring: false };
client.onYou(({ id, name, x, y, score }) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
})

client.onMap((width, height, map) => {
    console.log('map', width, height, map);
})

const parcels = new Map();
client.onParcelsSensing(async (perceived_parcels) => {
    for (const p of perceived_parcels) {
        parcels.set(p.id, p)
    }
})



/**
 * BDI loop
 */

function agentLoop() {

    /**
     * Options
     */
    const options = [];
    for (const parcel of parcels.values())
        if (!parcel.carriedBy && me.carring === false)
            options.push({ desire: 'go_to_astar', args: [parcel] });


    /**
     * Select best intention
     */
    let best_option;
    let nearest = Number.MAX_VALUE;
    for (const option of options) {
        let current_i = option.desire
        let current_d = distance(option.args[0], me)
        if (current_i == 'go_to_astar' && current_d < nearest) {
            best_option = option
            nearest = distance(option.args[0], me)
        }
    }

    /**
     * Revise/queue intention 
     */
    if (best_option) {
        myAgent.queue(best_option.desire, ...best_option.args)
        myAgent.queue('pickup', {});
        myAgent.queue('go_to', { x: 1, y: 1 })
    }


}
client.onParcelsSensing(agentLoop)
// client.onAgentsSensing( agentLoop )
// client.onYou( agentLoop )



/**
 * Intention revision / execution loop
 */
class Agent {

    intention_queue = new Array();

    async intentionLoop() {
        while (true) {
            const intention = this.intention_queue.shift();
            if (intention)
                await intention.achieve();
            await new Promise(res => setImmediate(res));
        }
    }

    async queue(desire, ...args) {
        const last = this.intention_queue.at(this.intention_queue.length - 1);
        const current = new Intention(desire, ...args)
        this.intention_queue.push(current);
    }

    async stop() {
        console.log('stop agent queued intentions');
        for (const intention of this.intention_queue) {
            intention.stop();
        }
    }

}

class Mappa {

    #map;

    constructor(width, height) {
        this.width = width
        this.height = height
        this.#map = Array(width).fill().map(() => Array(height).fill('#'))
        console.log('map', this.#map);
    }

    set(x, y, value) {
        this.#map[x][y] = value;
    }

    get(x, y) {
        return this.#map[x][y];
    }

    getMap() {
        return this.#map;
    }

    print() {
        for (let y = 0; y < this.height; y++) {
            let row = '';
            for (let x = 0; x < this.width; x++) {
                row += this.get(x, y);
            }
            console.log(row);
        }
    }

}

const easystar = new easystarjs.js();

client.onMap((width, height, map) => {
    const mappa = new Mappa(width, height);
    for (const { x, y, delivery } of map) {
        mappa.set(y, x, delivery ? 'O' : '+');
    }
    easystar.setGrid(mappa.getMap());
    easystar.setAcceptableTiles(['+', 'O']);
})


const myAgent = new Agent();
myAgent.intentionLoop();

// client.onYou( () => myAgent.queue( 'go_to', {x:11, y:6} ) )

// client.onParcelsSensing( parcels => {
//     for (const {x, y, carriedBy} of parcels) {
//         if ( ! carriedBy )
//             myAgent.queue( 'go_pick_up', {x, y} );
//     }
// } )



/**
 * Intention
 */
class Intention extends Promise {

    #current_plan;
    stop() {
        console.log('stop intention and current plan');
        this.#current_plan.stop();
    }

    #desire;
    #args;

    #resolve;
    #reject;

    constructor(desire, ...args) {
        var resolve, reject;
        super(async (res, rej) => {
            resolve = res; reject = rej;
        })
        this.#resolve = resolve
        this.#reject = reject
        this.#desire = desire;
        this.#args = args;
    }

    #started = false;
    async achieve() {
        if (this.#started)
            return this;
        else
            this.#started = true;

        for (const plan of plans) {
            if (plan.isApplicableTo(this.#desire)) {
                this.#current_plan = plan;
                // console.log('achieving desire', this.#desire, ...this.#args, 'with plan', plan);
                try {
                    const plan_res = await plan.execute(...this.#args);
                    this.#resolve(plan_res);
                    // console.log('plan', plan, 'succesfully achieved intention', this.#desire, ...this.#args, 'with result', plan_res);
                    return plan_res
                } catch (error) {
                    // console.log('plan', plan, 'failed while trying to achieve intention', this.#desire, ...this.#args, 'with error', error);
                }
            }
        }

        this.#reject();
        // console.log('no plan satisfied the desire ', this.#desire, ...this.#args);
        throw 'no plan satisfied the desire ' + this.#desire;
    }

}

/**
 * Plan library
 */
const plans = [];

class Plan {

    stop() {
        console.log('stop plan and all sub intentions');
        for (const i of this.#sub_intentions) {
            i.stop();
        }
    }

    #sub_intentions = [];

    async subIntention(desire, ...args) {
        const sub_intention = new Intention(desire, ...args);
        this.#sub_intentions.push(sub_intention);
        return await sub_intention.achieve();
    }

}


class GoPickUp extends Plan {

    isApplicableTo(desire) {
        return desire == 'go_pick_up';
    }

    async execute({ x, y }) {
        await this.subIntention('go_to', { x, y });
        await client.pickup()
    }

}

class Pickup extends Plan {

    isApplicableTo(desire) {
        return desire == 'pickup';
    }

    async execute() {
        await client.pickup()
    }

}


class GotoA extends Plan {

    paths = [];

    isApplicableTo(desire) {
        return desire == 'go_to_astar';
    }

    findPath({ x, y }){
        const self = this;
        easystar.findPath(me.x, me.y, x, y, function (path) {
            if (path === null) {
                console.log("Path was not found ( :[ ).");
            } else {
                console.log(x,y)
                path.forEach(async ({ x, y }) => {
                    myAgent.queue('go_to', { x, y });
                });
            }
        });
        easystar.calculate();
    }

    async execute({ x, y }) {

        let sub_int = [];
        this.findPath({ x, y });
        me.carring = true;
    }

}


class BlindMove extends Plan {

    isApplicableTo(desire) {
        return desire == 'go_to';
    }

    async execute({ x, y }) {
        while (me.x != x || me.y != y) {

            let status_x = undefined;
            let status_y = undefined;

            // console.log('me', me, 'xy', x, y);

            if (x > me.x)
                status_x = await client.move('right')
            // status_x = await this.subIntention( 'go_to', {x: me.x+1, y: me.y} );
            else if (x < me.x)
                status_x = await client.move('left')
            // status_x = await this.subIntention( 'go_to', {x: me.x-1, y: me.y} );

            if (status_x) {
                me.x = status_x.x;
                me.y = status_x.y;
            }

            if (y > me.y)
                status_y = await client.move('up')
            // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y+1} );
            else if (y < me.y)
                status_y = await client.move('down')
            // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y-1} );

            if (status_y) {
                me.x = status_y.x;
                me.y = status_y.y;
            }

            if (!status_x && !status_y) {
                // console.log('stucked')
                break;
            } else if (me.x == x && me.y == y) {
                // console.log('target reached')
            }

        }

    }
}

plans.push(new GoPickUp())
plans.push(new GotoA())
plans.push(new Pickup())
plans.push(new BlindMove())
