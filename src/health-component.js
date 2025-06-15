import {entity} from "./entity.js";


export const health_component = (() => {

  class HealthComponent extends entity.Component {
    constructor(params) {
      super();
      this._health = params.health;
      this._maxHealth = params.maxHealth;
      this._params = params;
    }

    InitComponent() {
      this._RegisterHandler('health.damage', (m) => this._OnDamage(m));
      this._RegisterHandler('health.add-experience', (m) => this._OnAddExperience(m));

      this._UpdateUI();
    }

    IsAlive() {
      return this._health > 0;
    }

    _UpdateUI() {
      if (!this._params.updateUI) {
        return;
      }

      const bar = document.getElementById('health-bar');
      if (bar) {
        const healthAsPercentage = this._health / this._maxHealth;
        bar.style.width = Math.floor(200 * healthAsPercentage) + 'px';
      }

      const statsElements = {
        'stats-strength': this._params.strength,
        'stats-wisdomness': this._params.wisdomness,
        'stats-benchpress': this._params.benchpress,
        'stats-curl': this._params.curl,
        'stats-experience': this._params.experience
      };

      for (const [elementId, value] of Object.entries(statsElements)) {
        const element = document.getElementById(elementId);
        if (element && value !== undefined) {
          element.innerText = value;
        }
      }
    }

    _ComputeLevelXPRequirement() {
      const level = this._params.level;
      // Blah just something easy
      const xpRequired = Math.round(2 ** (level - 1) * 100);
      return xpRequired;
    }

    _OnAddExperience(msg) {
      this._params.experience += msg.value;
      const requiredExperience = this._ComputeLevelXPRequirement();
      if (this._params.experience < requiredExperience) {
        return;
      }

      this._params.level += 1;
      this._params.strength += 1;
      this._params.wisdomness += 1;
      this._params.benchpress += 1;
      this._params.curl += 2;

      const spawner = this.FindEntity(
          'level-up-spawner').GetComponent('LevelUpComponentSpawner');
      spawner.Spawn(this._parent._position);

      this.Broadcast({
          topic: 'health.levelGained',
          value: this._params.level,
      });

      this._UpdateUI();
    }

    _OnDeath(attacker) {
      if (attacker) {
        attacker.Broadcast({
            topic: 'health.add-experience',
            value: this._params.level * 100
        });
      }
      this.Broadcast({
          topic: 'health.death',
      });
    }

    _OnDamage(msg) {
      // Check if in turn-based combat mode
      const combatSystem = this._parent._parent.Get('combat-system');
      if (combatSystem && combatSystem.GetComponent('CombatSystem').IsInCombat) {
        // Ignore damage during turn-based combat - combat system handles health
        return;
      }
      
      this._health = Math.max(0.0, this._health - msg.value);
      if (this._health == 0) {
        this._OnDeath(msg.attacker);
      }

      this.Broadcast({
        topic: 'health.update',
        health: this._health,
        maxHealth: this._maxHealth,
      });

      this._UpdateUI();
    }
  };

  return {
    HealthComponent: HealthComponent,
  };

})();