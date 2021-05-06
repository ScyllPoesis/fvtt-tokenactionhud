import { ActionHandler } from "../actionHandler.js";
import * as settings from "../../settings.js";

export class ActionHandlerLancer extends ActionHandler {
  constructor(filterManager, categoryManager) {
    super(filterManager, categoryManager);
  }

  /** @override */
  async doBuildActionList(token, multipleTokens) {
    let result = this.initializeEmptyActionList();

    if (!token) return result;

    let tokenId = token.data._id;

    result.tokenId = tokenId;

    let actor = token.actor;

    if (!actor) return result;

    result.actorId = actor._id;

    switch (actor.data.type) {
      case "pilot":
        // TODO: figure out new pilot data and owned item paths.
        break;
      case "mech":
        this._combineCategoryWithList(result, this.i18n("tokenactionhud.mech"), this._mechCategory(actor, tokenId));
        this._combineCategoryWithList(
          result,
          this.i18n("tokenactionhud.weapons"),
          this._weaponsCategory(actor, tokenId)
        );
        this._combineCategoryWithList(
          result,
          this.i18n("tokenactionhud.systems"),
          this._systemsCategory(actor, tokenId)
        );
        break;
      case "npc":
        this._combineCategoryWithList(result, this.i18n("tokenactionhud.stats"), this._npcBaseCategory(actor, tokenId));
        this._combineCategoryWithList(
          result,
          this.i18n("tokenactionhud.features"),
          this._npcFeatureCategory(actor, tokenId)
        );
        break;
    }

    if (settings.get("showHudTitle")) result.hudTitle = token.data?.name;

    return result;
  }

  _makeAction(actionName, macroType, tokenId, actionId, option) {
    let action = this.initializeEmptyAction();

    // Build name
    action.name = actionName;
    if (option) {
      option.max && (action.name += ` [${option.uses}/${option.max}]`);
      option.charged && (action.icon = `<i class="mdi mdi-flash"></i>`);
      option.loading && (action.icon = `<i class="mdi mdi-ammunition"></i>`);
    }

    action.encodedValue = [macroType, tokenId, actionId, JSON.stringify(option ? option : {})].join(this.delimiter);
    return action;
  }

  _makeItemSubCat(name, itemType, actor, tokenId) {
    let result = this.initializeEmptySubcategory();
    let macro = "item";

    result.name = name;
    result.actions = actor.data.items
      .filter((item) => {
        return item.type === itemType;
      })
      .map((item) => {
        return this._makeAction(item.name, macro, tokenId, item._id, this._getUseData(item));
      });

    return result;
  }

  _makeNPCItemSubCat(name, itemType, actor, tokenId) {
    let result = this.initializeEmptySubcategory();
    let macro = "item";

    result.name = name;
    result.actions = actor.data.items
      .filter((item) => {
        return item.type === "npc_feature";
      })
      .filter((item) => {
        return item.data.type === itemType;
      })
      .map((item) => {
        return this._makeAction(item.name, macro, tokenId, item._id, this._getUseData(item));
      });

    return result;
  }

  _pilotCategory(actor, tokenId) {
    let result = this.initializeEmptyCategory("pilot");

    [
      this._skillsSubCategory(actor, tokenId),
      this._talentsSubCategory(actor, tokenId),
      this._pilotGearSubCategory(actor, tokenId),
      this._pilotWeaponSubCategory(actor, tokenId),
    ].forEach((subCat) => {
      this._combineSubcategoryWithCategory(result, subCat.name, subCat);
    });

    return result;
  }

  _mechCategory(actor, tokenId) {
    let result = this.initializeEmptyCategory("mech");

    [
      this._haseSubCategory(tokenId),
      this._statSubCategory(tokenId),
      this._coreBonSubCategory(actor, tokenId),
      this._corePowerSubCategory(actor, tokenId),
    ].forEach((subCat) => {
      this._combineSubcategoryWithCategory(result, subCat.name, subCat);
    });

    return result;
  }

  _npcBaseCategory(actor, tokenId) {
    let result = this.initializeEmptyCategory("mech");

    [this._haseSubCategory(tokenId)].forEach((subCat) => {
      this._combineSubcategoryWithCategory(result, subCat.name, subCat);
    });

    return result;
  }

  _npcFeatureCategory(actor, tokenId) {
    let result = this.initializeEmptyCategory("feature");

    [
      this._npcWeaponSubCat(actor, tokenId),
      this._npcTechSubCat(actor, tokenId),
      this._npcReactionSubCat(actor, tokenId),
      this._npcSystemSubCat(actor, tokenId),
      this._npcTraitSubCat(actor, tokenId),
    ].forEach((subCat) => {
      this._combineSubcategoryWithCategory(result, subCat.name, subCat);
    });

    return result;
  }

  _npcWeaponSubCat(actor, tokenId) {
    return this._makeNPCItemSubCat(this.i18n("tokenactionhud.weapons"), "Weapon", actor, tokenId);
  }

  _npcTraitSubCat(actor, tokenId) {
    return this._makeNPCItemSubCat(this.i18n("tokenactionhud.traits"), "Trait", actor, tokenId);
  }

  _npcSystemSubCat(actor, tokenId) {
    return this._makeNPCItemSubCat(this.i18n("tokenactionhud.systems"), "System", actor, tokenId);
  }

  _npcTechSubCat(actor, tokenId) {
    return this._makeNPCItemSubCat(this.i18n("tokenactionhud.techs"), "Tech", actor, tokenId);
  }

  _npcReactionSubCat(actor, tokenId) {
    return this._makeNPCItemSubCat(this.i18n("tokenactionhud.reactions"), "Reaction", actor, tokenId);
  }

  _skillsSubCategory(actor, tokenId) {
    return this._makeItemSubCat(this.i18n("tokenactionhud.skilltriggers"), "skill", actor, tokenId);
  }

  _talentsSubCategory(actor, tokenId) {
    let result = this.initializeEmptySubcategory();
    let macro = "item";

    result.id = "talent";
    result.name = this.i18n("tokenactionhud.talents");

    let itemSubCats = actor.data.items
      .filter((item) => {
        return item.type === "talent";
      })
      .map((talent) => {
        let subcat = this.initializeEmptySubcategory();
        subcat.name = talent.name;

        for (let i = 0; i < talent.data.rank; i++) {
          let option = { rank: i };
          let action = this._makeAction(
            `${this.i18n("tokenactionhud.rank")} ${i + 1}`,
            macro,
            tokenId,
            talent._id,
            option
          );
          subcat.actions.push(action);
        }

        return subcat;
      });

    this._combineSubcategoryWithCategory;

    result.subcategories = itemSubCats;

    return result;
  }

  _pilotWeaponSubCategory(actor, tokenId) {
    return this._makeItemSubCat(this.i18n("tokenactionhud.weapons"), "pilot_weapon", actor, tokenId);
  }

  _pilotGearSubCategory(actor, tokenId) {
    return this._makeItemSubCat(this.i18n("tokenactionhud.gear"), "pilot_gear", actor, tokenId);
  }

  _haseSubCategory(tokenId) {
    let result = this.initializeEmptySubcategory();
    let macro = "hase";

    result.id = "hase";
    result.name = this.i18n("tokenactionhud.hase");

    let hull = this.i18n("tokenactionhud.hull");
    let agility = this.i18n("tokenactionhud.attribute.agility");
    let systems = this.i18n("tokenactionhud.systems");
    let engineering = this.i18n("tokenactionhud.engineering");

    let haseActionData = [
      { name: hull, id: "mm.ent.Hull" },
      { name: agility, id: "mm.ent.Agility" },
      { name: systems, id: "mm.ent.Systems" },
      { name: engineering, id: "mm.ent.Engineering" },
    ];

    let haseActions = haseActionData.map((actionData) => {
      return this._makeAction(actionData.name, macro, tokenId, actionData.id);
    });

    result.actions = haseActions;

    return result;
  }

  _statSubCategory(tokenId) {
    let result = this.initializeEmptySubcategory();
    let macro = "stat";

    result.id = "stat";
    result.name = this.i18n("tokenactionhud.stat");

    // let grit = this.i18n("tokenactionhud.grit");
    let techAttack = this.i18n("tokenactionhud.techattack");

    let statActionData = [
      // { name: grit, data: "pilot.grit" },
      { name: techAttack, data: "mm.ent.TechAttack" },
    ];

    let statActions = statActionData.map((actionData) => {
      return this._makeAction(actionData.name, macro, tokenId, actionData.data);
    });

    result.actions = statActions;

    return result;
  }

  _coreBonSubCategory(actor, tokenId) {
    return this._makeItemSubCat(this.i18n("tokenactionhud.corebonus"), "core_bonus", actor, tokenId);
  }

  _corePowerSubCategory(actor, tokenId) {
    let result = this.initializeEmptySubcategory();

    let frame = actor.data.items.find((item) => {
      return item.type === "frame";
    });
    let core = frame.data.core_system;

    result.name = core.name;

    if (core.passive_name) {
      result.actions.push(this._makeAction(core.passive_name, "corePassive", tokenId, ""));
    }
    if (core.active_name) {
      result.actions.push(this._makeAction(core.active_name, "coreActive", tokenId, ""));
    }

    return result;
  }

  _weaponsCategory(actor, tokenId) {
    let result = this.initializeEmptyCategory();
    let macro = "item";

    result.id = "weapons";
    result.name = this.i18n("tokenactionhud.weapons");

    let itemSubCats = actor.data.items
      .filter((item) => {
        return item.type === "mech_weapon";
      })
      .map((weapon) => {
        let subcat = this.initializeEmptySubcategory(weapon.id);
        subcat.name = weapon.name;

        let loadingTag = weapon.data.profiles[weapon.data.selected_profile].tags.find(
          (tag) => tag.tag.fallback_lid === "tg_loading"
        );
        let loadData = {};
        if (loadingTag) {
          loadData.uses = weapon.data.loaded ? 1 : 0;
          loadData.max = 1;
          loadData.loading = true;
        }

        let attack = this._makeAction(this.i18n("tokenactionhud.attack"), macro, tokenId, weapon._id, loadData);

        subcat.actions = [attack];

        return subcat;
      });

    itemSubCats.forEach((subCat) => {
      this._combineSubcategoryWithCategory(result, subCat.name, subCat);
    });

    return result;
  }

  _systemsCategory(actor, tokenId) {
    let result = this.initializeEmptyCategory();
    let macro = "item";

    result.id = "systems";
    result.name = this.i18n("tokenactionhud.systems");

    let itemSubCats = actor.data.items
      .filter((item) => {
        return item.type === "mech_system";
      })
      .map((system) => {
        let subcat = this.initializeEmptySubcategory(system.id);
        subcat.name = system.name;

        let activation = this._makeAction(this.i18n("tokenactionhud.activate"), macro, tokenId, system._id);

        subcat.actions = [activation];

        return subcat;
      });

    itemSubCats.forEach((subCat) => {
      this._combineSubcategoryWithCategory(result, subCat.name, subCat);
    });

    return result;
  }

  _getUseData(item) {
    let isCharged = false;
    let currentUses = 0;
    let maxUses = 0;

    let chargeTag = item.data.tags.find((tag) => tag.tag.fallback_lid === "tg_recharge");
    if (chargeTag) {
      isCharged = true;
      currentUses = item.data.charged ? 1 : 0;
      maxUses = 1;
    }
    let limitedTag = item.data.tags.find((tag) => tag.tag.fallback_lid === "tg_limited");
    if (limitedTag) {
      currentUses = item.data.uses;
      maxUses = limitedTag.val;
    }

    return { uses: currentUses, max: maxUses, charged: isCharged };
  }
}
