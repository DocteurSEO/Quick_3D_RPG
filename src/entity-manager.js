

export const entity_manager = (() => {

  class EntityManager {
    constructor() {
      this._ids = 0;
      this._entitiesMap = {};
      this._entities = [];
    }

    _GenerateName() {
      this._ids += 1;

      return '__name__' + this._ids;
    }

    Get(n) {
      return this._entitiesMap[n];
    }

    Filter(cb) {
      return this._entities.filter(cb);
    }

    Add(e, n) {
      if (!n) {
        n = this._GenerateName();
      }

      this._entitiesMap[n] = e;
      this._entities.push(e);

      e.SetParent(this);
      e.SetName(n);
    }

    SetActive(e, b) {
      const i = this._entities.indexOf(e);
      if (i < 0) {
        return;
      }

      this._entities.splice(i, 1);
    }

    Remove(entity) {
      // Find entity name in the map
      let entityName = null;
      for (let [name, e] of Object.entries(this._entitiesMap)) {
        if (e === entity) {
          entityName = name;
          break;
        }
      }
      
      if (entityName) {
        // Remove from map
        delete this._entitiesMap[entityName];
        
        // Remove from array
        const index = this._entities.indexOf(entity);
        if (index > -1) {
          this._entities.splice(index, 1);
        }
        
        return true;
      }
      
      return false;
    }

    Update(timeElapsed) {
      for (let e of this._entities) {
        e.Update(timeElapsed);
      }
    }
  }

  return {
    EntityManager: EntityManager
  };

})();