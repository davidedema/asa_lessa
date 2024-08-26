import Msg from './Msg.js';
import { areStuckedInACLosedPath, getOppositeDirection } from "./utils.js";

// This function is used in order to handle the communication between agents


export async function handleMsg(id, msg, replyAcknowledgmentCallback, me, grid, client, myAgent, perceivedAgents) {
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

            // if we use the split map stragey, apply it
            if (me.strategy === "split_map") {
                console.log("Split Map Strategy")
                msg = new Msg();
                msg.setHeader("SPLIT_MAP");
                if (me.y > grid.height / 2) {
                    const zone = {
                        minX: 0,
                        maxX: grid.width,
                        minY: Math.floor(grid.height / 2),
                        maxY: grid.height
                    }
                    me.setSplitMapZone(zone)
                    const slaveZone = {
                        minX: 0,
                        maxX: grid.width,
                        minY: 0,
                        maxY: Math.floor(grid.height / 2) - 1
                    }
                    msg.setContent(slaveZone)
                } else {
                    const zone = {
                        minX: 0,
                        maxX: grid.width,
                        minY: 0,
                        maxY: Math.floor(grid.height / 2) - 1
                    }
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

    //* Exchange informations
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
    // Agents
    } else if (msg.header === 'INFO_AGENTS') {
        let perceived_agents = msg.content;

        for (const agent of perceived_agents) {
            if (agent.id !== me.id) {
                perceivedAgents.set(agent.id, agent);
                grid.setAgent(agent.id, agent.x, agent.y, Date.now())
            }
        }
    // Want to do the split map strategy
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
            myAgent.push_priority_action("go_to_astar", destination, grid, me)
        }
        console.log(msg.content)
    } else if (msg.header === "CURRENT_INTENTION") {
        me.friendIntention = msg.content
    } else if (msg.header === "COMPLETED_INTENTION") {
        myAgent.erase(msg.content)

    // if we are stucked together
    } else if (msg.header === "STUCKED_TOGETHER" && me.name === "master") {

        // basic idea:
        // if we are stucked in a closed path, if one has to put down parcels, it will be pass all the parcels to the friend, and the friend will 
        // put down all the parcels for both
        // if both are going to pick up parcels they should swap their intention (maybe also their carried parcel but idk)
        // if they are not stucked in a closed put and at least one agent can do another action, it will calculate
        // the reachable points that are not part of the route of his friend and move to the nearest one
        // then it will notify his friend in order to make it move
        
        me.stuckedFriend = true;
        const friendDirection = msg.content.direction;
        const friendPath = msg.content.path;
        const possibleDirection = grid.getPossibleDirection(me.x, me.y);

        if (areStuckedInACLosedPath(possibleDirection, friendDirection)) {
            if (me.currentIntention.predicate !== "go_put_down" && me.friendIntention.predicate !== "go_put_down") {
                if (me.stuckedFriend) {
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
            if (possibleDirection.length > 1) {
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
                    if (me.stuckedFriend) {
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
            } else {
                let msg = new Msg();
                msg.setHeader("MOVE_OUT_OF_MY_PATH");
                const content = { path: me.currentPath }
                msg.setContent(content)
                await client.say(id, msg)
            }
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
            if (me.stuckedFriend) {
                me.stuckedFriend = false
                myAgent.loop()
            }
        } else {
            console.log("ERROR")
        }
    }
}