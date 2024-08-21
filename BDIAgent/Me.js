class Me {
    constructor() {
        this.id = undefined;
        this.name = undefined;
        this.x = undefined;
        this.y = undefined;
        this.score = undefined;
        this.carring = false;
        this._number_of_parcels_carried = 0;
        this.pointLossInOneSecond = undefined;
        this.movementDuration = undefined;
        this.pddl = process.argv[2] === 'pddl';
        this.master = process.argv[3] === 'master';
        this.friendId = undefined;
        this.currentIntention = undefined;
        this.friendIntention = undefined;
        this.friendPosition = undefined;
        this.stuckedFriend = false;
        this.strategy =  process.argv[4] || "default";
        this.splitMapZone = undefined
        this.currentPath = undefined;
    }

    get number_of_parcels_carried() {
        return this._number_of_parcels_carried;
    }

    set number_of_parcels_carried(value) {
        this._number_of_parcels_carried = value;
    }

    setCurrentIntention(intention) {
        this.currentIntention = intention;
    }

    setSplitMapZone(zone){
        this.splitMapZone = zone
    }

    setFriendId(id) {
        this.friendId = id;
    }

    setValues({ id, name, x, y, score }) {
        if (Number.isInteger(x) && Number.isInteger(y)) {
            this.id = id;
            this.name = name;
            this.x = x;
            this.y = y;
            this.score = score;
        }
    }
}

export default Me;