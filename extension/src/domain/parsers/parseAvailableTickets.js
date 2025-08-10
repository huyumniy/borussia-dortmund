class ParseAvailableTickets {
    constructor(areaList, amount = 1, tribunes = []) {
        this.areaList = areaList
        this.amount = amount
        this.tribunes = tribunes
    }
    
    getAreaBasedOnAreaID(desiredId = null) {
        return desiredId 
        ? this.areasWithCertainAmountOfSeats
        .filter(({ id }) => desiredId === id)
        : this.areasWithCertainAmountOfSeats
    }

    getAvailableSubAreasByAreaId(areaId) {
        const area = this.areasWithCertainAmountOfSeats
        .find(a => a.id === areaId);
        if (!area || !Array.isArray(area.subAreas)) return [];
        return area.subAreas
        .filter(sub => sub.freeSeats >= this.amount);
    }

    getAreaIdBasedOnAreaName(areaName) {
        return this.areaList
        .find(({ name }) => name === areaName).id
    }

    get areaListWithFreeSeats() {
        return this.areaList
        .filter(({ freeSeats }) => freeSeats > 0);
    }

    get areasWithCertainAmountOfSeats() {
        return this.areaListWithFreeSeats
        .filter(({ freeSeats }) => freeSeats >= this.amount)
    }

    get areasWithCertainTribunes() {
        return this.tribunes 
        ? this.areasWithCertainAmountOfSeats
        .filter(({ name }) => this.tribunes.includes(name)) 
        : this.areasWithCertainAmountOfSeats
    }
    
}

export default ParseAvailableTickets;
