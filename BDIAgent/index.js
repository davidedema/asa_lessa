import Grid from "./Grid.js";
import Me from "./Me.js";
import client from "./client.js";
import IntentionRevisionRevise from "./IntentionRevision.js";
import Msg from "./Msg.js";
import { astar, Graph } from './astar.js';

function areDirectionOpposite(direction1, direction2) {
    if (direction1 === "up" && direction2 === "down") {
        return true;
    }
    if (direction1 === "down" && direction2 === "up") {
        return true;
    }
    if (direction1 === "left" && direction2 === "right") {
        return true;
    }
    if (direction1 === "right" && direction2 === "left") {
        return true;
    }
    return false;
}

function areStuckedInACLosedPath(directions1, directions2) {
    if (directions1.length > 1 || directions2.length > 1) {
        // console.log("Posso fare quello che voglio")
        // console.log("Master: ", directions1)
        // console.log("Slave: ", directions2)
        return false;
    } else if (directions1.length === 1 && directions2.length === 1) {
        return true;
    }
    else if (directions1.length === 0 || directions2.length === 0) {
        // console.log("Non so che cazzo fare")
        return true;
    }
    else {
        return areDirectionOpposite(directions1[0].name, directions2[0].name)
    }
}

function getOppositeDirection(direction) {
    if (direction === "up") {
        return "down";
    }
    if (direction === "down") {
        return "up";
    }
    if (direction === "left") {
        return "right";
    }
    if (direction === "right") {
        return "left";
    }
}

var grid = undefined;

var me = new Me();
/**
 * Belief revision function
*/

client.onYou(({ id, name, x, y, score }) => {
    me.setValues({ id, name, x, y, score });
    myAgent.me = me;
})

const parcels = new Map();

const perceivedAgents = new Map();

const myAgent = new IntentionRevisionRevise(grid, me);
myAgent.loop();

/**
 * BDI loop
*/

function agentLoop(perceived_parcels) {

    const parcelsToNotify = []

    if (perceived_parcels.length == 0) return;
    let time = Date.now();
    for (const p of perceived_parcels) {
        p.time = time;
        if (me.splitMapZone) {
            if (p.x >= me.splitMapZone.minX && p.x <= me.splitMapZone.maxX && p.y >= me.splitMapZone.minY && p.y <= me.splitMapZone.maxY) {
                parcels.set(p.id, p);
            }
        } else {
            parcels.set(p.id, p);
        }
    }


    // update parcels carried
    let i = 0;
    for (const p of perceived_parcels) {
        if (p.carriedBy == me.id) {
            i++;
        }
    }
    me._number_of_parcels_carried = i;

    const seenParcels = myAgent.get_parcerls_to_pickup();
    const options = [];
    for (const parcel of parcels.values()) {
        if (!parcel.carriedBy && !seenParcels.includes(parcel.id)) {
            options.push({ desire: 'go_pick_up', args: [parcel, grid, me] });
            parcelsToNotify.push(parcel);
        }
    }

    // if i have a friend, i can send him the perceived parcels
    if (me.strategy !== "split_map" && me.friendId && parcelsToNotify.length > 0) {
        let msg = new Msg();
        msg.setHeader("INFO_PARCELS");
        msg.setContent(parcelsToNotify);
        client.say(me.friendId, msg);
    }

    for (const option of options) {
        myAgent.push(option.desire, ...option.args)

    }

}

async function agentPerception(perceived_agents) {
    const timeSeen = Date.now();

    perceivedAgents.forEach((value, key) => {
        value.isNear = false;
        if (timeSeen - value.timeSeen > 20000) {
            perceivedAgents.delete(key);
        }
    });

    for (const agent of perceived_agents) {
        perceivedAgents.set(agent.id, { agent, timeSeen, isNear: true });
        grid.setAgent(agent.id, agent.x, agent.y, timeSeen)
    }

    if (me.friendId && perceived_agents.length > 0) {
        let msg = new Msg();
        msg.setHeader("INFO_AGENTS");
        msg.setContent(perceived_agents);
        client.say(me.friendId, msg);
    }
}

client.onParcelsSensing(async (perceived_parcels) => agentLoop(perceived_parcels));

client.onAgentsSensing(async (perceived_agents) => agentPerception(perceived_agents));


client.onMap((height, width, map) => {
    grid = new Grid(width, height);
    for (const { x, y, delivery } of map) {
        grid.set(y, x, delivery ? 1 : 2);
    }
    grid.setIds();
    const parcelSpawner = [];
    for (const parcel of map) {
        if (parcel.parcelSpawner) {
            parcelSpawner.push({ x: parcel.x, y: parcel.y });
        }
    }
    grid.setSpawnPoints(parcelSpawner);
    myAgent.grid = grid;
});


client.onConfig((config) => {
    if (config.PARCEL_DECADING_INTERVAL != 'infinite') {
        // from string to int
        var pointLossInOneSecond = parseInt(config.PARCEL_DECADING_INTERVAL.slice(0, -1));
        me.pointLossInOneSecond = pointLossInOneSecond;
    }
    // TODO change this one
    else {
        me.pointLossInOneSecond = NaN;
    }
    if (config['MOVEMENT_DURATION']) {
        me.movementDuration = config['MOVEMENT_DURATION'];
    }
});

async function handleMsg(id, name, msg, replyAcknowledgmentCallback) {
    // finalize the handshake
    if (msg.header == 'HANDSHAKE') {
        if (!me.master && msg.content == 'acquarium?') {
            me.setFriendId(id);
            let msg = new Msg();
            msg.setHeader("HANDSHAKE");
            msg.setContent("acquarium!");
            await client.say(id, msg, replyAcknowledgmentCallback);
            msg.setHeader("CURRENT_INTENTION");
            msg.setContent(me.currentIntention)
            await client.say(id, msg)
        }
        if (me.master && msg.content == 'acquarium!') {
            me.setFriendId(id);
            console.log('Handshake completed');
            let msg = new Msg();
            msg.setHeader("START_JOB");
            msg.setContent({ x: me.x, y: me.y });
            await client.say(id, msg, replyAcknowledgmentCallback);
            console.log(me.strategy)
            if (me.strategy === "split_map") {

                msg = new Msg();
                msg.setHeader("SPLIT_MAP");

                if (me.y > grid.height / 2) {
                    console.log("MASTER GRID ALTA")
                    const zone = {
                        minX: 0,
                        maxX: grid.width,
                        minY: Math.floor(grid.height / 2),
                        maxY: grid.height
                    }
                    console.log(zone)
                    me.setSplitMapZone(zone)
                    const slaveZone = {
                        minX: 0,
                        maxX: grid.width,
                        minY: 0,
                        maxY: Math.floor(grid.height / 2) - 1
                    }

                    msg.setContent(slaveZone)

                } else {
                    console.log("MASTER GRID BASSA")

                    const zone = {
                        minX: 0,
                        maxX: grid.width,
                        minY: 0,
                        maxY: Math.floor(grid.height / 2) - 1
                    }
                    console.log(zone)

                    me.setSplitMapZone(zone)
                    const slaveZone = {
                        minX: 0,
                        maxX: grid.width,
                        minY: Math.floor(grid.height / 2),
                        maxY: grid.height
                    }

                    msg.setContent(slaveZone)
                }


                await client.say(id, msg)
            }
            msg.setHeader("CURRENT_INTENTION");
            msg.setContent(me.currentIntention)
            await client.say(id, msg)

        }
    }

    // exchange informations
    // parcels
    if (msg.header === 'INFO_PARCELS') {
        // see content and update the parcels if not already present
        const seenParcels = myAgent.get_parcerls_to_pickup();
        let new_parcels = msg.content;
        const options = [];
        for (const parcel of new_parcels) {
            if (!parcel.carriedBy && !seenParcels.includes(parcel.id)) {
                options.push({ desire: 'go_pick_up', args: [parcel, grid, me] });
            }
        }

        for (const option of options) {
            myAgent.push(option.desire, ...option.args)
        }

    } else if (msg.header === 'INFO_AGENTS') {
        let perceived_agents = msg.content;

        for (const agent of perceived_agents) {
            if (agent.id !== me.id) {
                perceivedAgents.set(agent.id, agent);
                grid.setAgent(agent.id, agent.x, agent.y, Date.now())
            }
            // console.log("set perceived agents" + agent.name + " : " + agent.x + " " + agent.y);
        }
    } else if (msg.header === "SPLIT_MAP") {
        me.setSplitMapZone(msg.content)
        const zone = msg.content;
        const destination = { x: zone.minX, y: zone.minY };
        if (me.x >= zone.minX && me.x <= zone.maxX && me.y >= zone.minY && me.y <= zone.maxY) {
            console.log("SLAVE ALREADY IN THE CORRECT ZONE");
        } else {
            console.log("SLAVE HAS TO MOVE IN THE CORRRECT ZONE");
            const map = grid.getMap()
            let _brake = false;
            for (let i = zone.minX; i <= zone.maxX; i++) {

                for (let j = zone.minY; j <= zone.maxY; j++) {
                    if (map[i][j] !== 0) {
                        destination.x = i
                        destination.y = j
                        _brake = true;
                        break;
                    }
                }
                if (_brake) { break }
            }
            myAgent.push("go_to_astar", destination, grid, me)
        }
        console.log(msg.content)
    } else if (msg.header === "CURRENT_INTENTION") {
        me.friendIntention = msg.content
        // if (me.currentIntention && me.friendIntention && me.currentIntention.predicate === "go_pick_up" && me.friendIntention.predicate === "go_pick_up") {
        //     if (me.currentIntention.get_args()[0].id === me.friendIntention.args[0].id) {
        //         console.log("-----------------------")
        //         console.log("Friend intention: ", msg.content.args[0].id)
        //         console.log("My intention: ", me.currentIntention.get_args()[0].id)
        //         console.log("-----------------------")
        //     }
        // }
    } else if (msg.header === "COMPLETED_INTENTION") {
        // console.log("COMPLETED INTENTION", msg.content)
        myAgent.erase(msg.content)
    } else if (msg.header === "STUCKED_TOGETHER" && me.name === "master") {

        // basic idea:
        // if we are stucked in a closed path, if one has to put down parcels, it will be pass all the parcels to the firend, and the firend will 
        // put down all the parcels for both
        // if both are going to pick up parcels they should swap their intention (maybe also their carried parcel but idk)

        me.stuckedFriend = true;
        const friendDirection = msg.content.direction;
        const friendPath = msg.content.path;
        const possibleDirection = grid.getPossibleDirection(me.x, me.y);

        if (areStuckedInACLosedPath(possibleDirection, friendDirection)) {
            if (me.currentIntention.predicate !== "go_put_down" && me.friendIntention.predicate !== "go_put_down") {
                if(me.stuckedFriend){
                    me.stuckedFriend = false;
                    myAgent.loop()
                }
                let newmsg = new Msg();
                newmsg.setHeader("STUCK_RESOLVED");
                await client.say(id, newmsg)
            }
            else if (me.currentIntention.predicate === "go_put_down" && possibleDirection.length > 0) {
                await client.putdown()
                const direction = possibleDirection[0].name;
                await client.move(direction)
                let msg = new Msg();
                msg.setHeader("PICK_UP_PARCELS_AND_PUT_DOWN");
                const content = { direction: direction }
                msg.setContent(content)
                await client.say(id, msg)
                console.log("send pick up parcels and put down")
            } else if (me.currentIntention.predicate === "go_put_down" && possibleDirection.length === 0) {
                let msg = new Msg();
                msg.setHeader("MOVE_IN_ORDER_TO_UNSTUCK_ME");
                const content = { direction: friendDirection[0].name }
                msg.setContent(content)
                await client.say(id, msg)
            } else if (me.friendIntention.predicate === "go_put_down" && friendDirection.length === 0) {
                await client.move(possibleDirection[0].name)
                let newmsg = new Msg();
                newmsg.setHeader("MOVE_AND_LEAVE_PARCELS_AND_MOVE");
                const content = { direction: possibleDirection[0].name }
                newmsg.setContent(content)
                await client.say(id, newmsg)
            } else if (possibleDirection.length === 0) {
                // otherwise if it will spawn a parcel where is stucked , it can't be able to pick up
                console.log("Unstack me and my friend")
                if (me.stuckedFriend) {
                    me.stuckedFriend = false;
                    myAgent.loop()
                }
                let newmsg = new Msg();
                newmsg.setHeader("STUCK_RESOLVED");
                await client.say(id, newmsg)
            } else if (me.friendIntention && me.friendIntention.predicate === "go_put_down") {
                let msg = new Msg();
                msg.setHeader("LEAVE_PARCELS_AND_MOVE")
                const content = { direction: friendDirection[0].name }
                msg.setContent(content)
                await client.say(id, msg)
                console.log("send leave parcels and move")
            }
        } else {
            if(possibleDirection.length >1 ){
                const reachablePoints = grid.getReachablePoints(me.x, me.y)
                const reachablePointsNotInFriendPath = []
                for (let i = 0; i < reachablePoints.length; i++) {
                    let reachable = false;
                    for (let j = 0; j < friendPath.length; j++) {
                        if (reachablePoints[i].x === friendPath[j].x && reachablePoints[i].y === friendPath[j].y) {
                            reachable = true;
                            break;
                        }
                    }
                    if (!reachable) {
                        reachablePointsNotInFriendPath.push(reachablePoints[i])
                    }
                }
                if (reachablePointsNotInFriendPath.length !== 0) {
                    myAgent.push_priority_action("MOVE_OUT_OF_MY_PATH", reachablePointsNotInFriendPath[0], grid, me)
                    if(me.stuckedFriend){
                        me.stuckedFriend = false
                        myAgent.loop()
                    }
                } else {
                    let msg = new Msg();
                    msg.setHeader("MOVE_OUT_OF_MY_PATH");
                    const content = { path: me.currentPath }
                    msg.setContent(content)
                    await client.say(id, msg)
                }
            }else{
                let msg = new Msg();
                msg.setHeader("MOVE_OUT_OF_MY_PATH");
                const content = { path: me.currentPath }
                msg.setContent(content)
                await client.say(id, msg)
            }
        }
    } else if (msg.header === "STUCKED_TOGETHER" && me.name === "slave") {
        // se entra qui vuol dire che il messaggio l'ha madnato il master
        if (me.stuckedFriend) {
            return;
        }
        
        const content = { direction: grid.getPossibleDirection(me.x, me.y), path: [], reachablePoint: grid.getReachablePoints(me.x, me.y) }
        if (possibleDirection.length === 0) {
            let newmsg = new Msg()
            newmsg.setHeader("STUCKED_TOGETHER")
            newmsg.setContent(possibleDirection)
            await client.say(id, newmsg)
        }
    } else if (msg.header === "PICK_UP_PARCELS_AND_PUT_DOWN") {
        console.log("PICK UP PARCELS AND PUT DOWN")
        const direction = msg.content.direction;
        await client.move(direction)
        await client.pickup()
        myAgent.push_priority_action("go_put_down", ...[grid, grid.getDeliverPoints(), me])
        if (me.stuckedFriend) {
            me.stuckedFriend = false;
            myAgent.loop()
        }
        let newmsg = new Msg();
        newmsg.setHeader("STUCK_RESOLVED");
        await client.say(id, newmsg)
    } else if (msg.header === "LEAVE_PARCELS_AND_MOVE") {
        console.log("LEAVE PARCELS AND MOVE")
        const direction = msg.content.direction;
        await client.putdown()
        await client.move(direction)
        let newmsg = new Msg();
        newmsg.setHeader("PICK_UP_PARCELS_AND_PUT_DOWN");
        const content = { direction: direction }
        newmsg.setContent(content)
        await client.say(id, newmsg)
    } else if (msg.header === "STUCK_RESOLVED") {
        if (me.stuckedFriend) {
            me.stuckedFriend = false;
            myAgent.loop()
            let newmsg = new Msg();
            newmsg.setHeader("STUCK_RESOLVED");
            await client.say(id, newmsg)
        }
    } else if (msg.header === "MOVE_IN_ORDER_TO_UNSTUCK_ME") {
        const direction = msg.content.direction;
        await client.move(direction)
        let newmsg = new Msg();
        newmsg.setHeader("MOVE_AND_LEAVE_PARCELS_AND_MOVE")
        const content = { direction: direction }
        newmsg.setContent(content)
        await client.say(id, newmsg)
    } else if (msg.header === "MOVE_AND_LEAVE_PARCELS_AND_MOVE") {
        const direction = msg.content.direction;
        await client.move(direction)
        await client.putdown()
        await client.move(getOppositeDirection(direction))
        let newmsg = new Msg();
        newmsg.setHeader("PICK_UP_PARCELS_AND_PUT_DOWN");
        newmsg.setContent({ direction: getOppositeDirection(direction) })
        await client.say(id, newmsg)
    } else if (msg.header === "CURRENT_POSITION") {
        me.friendPosition = msg.content;
    } else if (msg.header === "MOVE_OUT_OF_MY_PATH") {
        const friendPath = msg.content.path;
        const reachablePoints = grid.getReachablePoints(me.x, me.y)
        const reachablePointsNotInFriendPath = []
        for (let i = 0; i < reachablePoints.length; i++) {
            let reachable = false;
            for (let j = 0; j < friendPath.length; j++) {
                if (reachablePoints[i].x === friendPath[j].x && reachablePoints[i].y === friendPath[j].y) {
                    reachable = true;
                    break;
                }
            }
            if (!reachable) {
                reachablePointsNotInFriendPath.push(reachablePoints[i])
            }
        }
        if (reachablePointsNotInFriendPath.length !== 0) {
            myAgent.push_priority_action("MOVE_OUT_OF_MY_PATH", reachablePointsNotInFriendPath[0], grid, me)
            if(me.stuckedFriend){
                me.stuckedFriend = false
                myAgent.loop()
            }
        } else {
            console.log("ERRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRORRE")
        }
    }
}

// Essendo un architettura master-slave, il master inizializza la comunicazione, il slave risponde
client.onMsg(async (id, name, msg, replyAcknowledgmentCallback) => handleMsg(id, name, msg, replyAcknowledgmentCallback));

// send a message to init the handshake
client.onConnect(async () => {
    if (me.master) {
        let msg = new Msg();
        msg.setHeader("HANDSHAKE");
        msg.setContent("acquarium?")
        await client.shout(msg);
    }
});