class Me{
    constructor(){
        this.id = undefined;
        this.name = undefined;
        this.x = undefined;
        this.y = undefined;
        this.score = undefined;
        this.carring = false;
    }

    setValues({id, name, x, y, score}){
        this.id = id
        this.name = name
        this.x = x
        this.y = y
        this.score = score
    }
}

export default Me;