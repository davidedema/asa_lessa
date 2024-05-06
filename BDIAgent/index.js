import Agent from "./Agent.js";
import Grid from "./Grid.js";
import Me from "./Me.js";
import client from "./client.js";
import IntentionRevisionRevise from "./IntentionRevision.js";
import config from "./config.js";   


function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const dx = Math.abs(Math.round(x1) - Math.round(x2))
    const dy = Math.abs(Math.round(y1) - Math.round(y2))
    return dx + dy;
}

var grid = undefined;

const start = Date.now();

var me = new Me();
/**
 * Belief revision function
*/

client.onYou(({ id, name, x, y, score }) => {
    me.setValues({ id, name, x, y, score });
})

const parcels = new Map();

const perceivedAgents = new Map();

const myAgent = new IntentionRevisionRevise();
myAgent.loop();

/**
 * BDI loop
*/

function agentLoop(perceived_parcels) {
    if (perceived_parcels.length == 0) return;
    for (const p of perceived_parcels) {
        parcels.set(p.id, p);
    }
    /**
     * Options
    */
    const seenParcels = myAgent.get_parcerls_to_pickup();
    const options = [];
    for (const parcel of parcels.values()){
        if (!parcel.carriedBy && !seenParcels.includes(parcel.id)) {
            options.push({ desire: 'go_pick_up', args: [parcel, grid, me] });
        }
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
        myAgent.push(best_option.desire, ...best_option.args)
        myAgent.push('go_put_down', grid, grid.getDeliverPoints(), me);
    }


}

function agentPerception(perceived_agents) {
    const timeSeen = Date.now();

    perceivedAgents.forEach((value, key) => {
        value.isNear = false;
        if (timeSeen - value.timeSeen > 20000) {
            perceivedAgents.delete(key);
        }
    });

    for (const agent of perceived_agents) {
        perceivedAgents.set(agent.id, { agent, timeSeen, isNear: true });
        grid.setAgent(agent.x, agent.y, timeSeen)
    }

    // console.log(perceivedAgents.values())


}

client.onParcelsSensing(async (perceived_parcels) => agentLoop(perceived_parcels));

client.onAgentsSensing(async (perceived_agents) => agentPerception(perceived_agents));


client.onMap((width, height, map) => {
    grid = new Grid(width, height);
    for (const { x, y, delivery } of map) {
        grid.set(y, x, delivery ? 1 : 2);
    }
});

