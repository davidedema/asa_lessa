class Me{
    constructor(){
        this.id = undefined;
        this.name = undefined;
        this.x = undefined;
        this.y = undefined;
        this.score = undefined;
        this.carring = false;
        this._number_of_parcels_carried = 0;
    }

    get number_of_parcels_carried(){
        return this._number_of_parcels_carried;
    }

    set number_of_parcels_carried(value){
        this._number_of_parcels_carried = value;
    }

    setValues({id, name, x, y, score}){
        this.id = id
        this.name = name
        this.x = x
        this.y = y
        this.score = score
    }

    // get x(){
    //     return this.x;
    // }

    // get y(){
    //     return this.y;
    // }
}

export default Me;