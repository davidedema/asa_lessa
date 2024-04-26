import Agent from "./Agent.js";
import Grid from "./Grid.js";
import Me from "./Me.js";
import client from "./client.js";


function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const dx = Math.abs(Math.round(x1) - Math.round(x2))
    const dy = Math.abs(Math.round(y1) - Math.round(y2))
    return dx + dy;
}

var grid = undefined;

var seen = new Set();

var me = new Me();
/**
 * Belief revision function
 */

client.onYou(({ id, name, x, y, score }) => {
    me.setValues({ id, name, x, y, score });
})

const parcels = new Map();

const myAgent = new Agent();
myAgent.intentionLoop();

/**
 * BDI loop
 */

function agentLoop(perceived_parcels) {
    for (const p of perceived_parcels) {
        parcels.set(p.id, p);
    }
    /**
     * Options
     */
    const options = [];
    for (const parcel of parcels.values())
        if (!parcel.carriedBy && !seen.has(parcel.id)){
            seen.add(parcel.id);
            options.push({ desire: 'go_pick_up', args: [parcel, grid.getMap(), me, myAgent] });
        }



    /**
     * Select best intention
     */
    let best_option;
    let nearest = Number.MAX_VALUE;
    for (const option of options) {
        let current_i = option.desire
        let current_d = distance(option.args[0], me)
        if (current_i == 'go_pick_up' && current_d < nearest) {
            best_option = option
            nearest = current_d
        }
    }

    /**
     * Revise/queue intention 
     */
    if (best_option) {
        myAgent.queue(best_option.desire, ...best_option.args)
    }
}
client.onParcelsSensing(async (perceived_parcels) => agentLoop(perceived_parcels))

client.onMap((width, height, map) => {
    grid = new Grid(width, height);
    for (const { x, y, delivery } of map) {
        grid.set(y, x, delivery ? 1 : 1);
    }
})

