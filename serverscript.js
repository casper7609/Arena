var catalogVersion = "0.9";
var LVL_UP_PAC = "LVL_UP_PAC";
var MON_SUB_PAC = "MON_SUB_PAC";
var UserInventoryMax = 20;
var enchantPriceInIP = 10;
function rand(from, to) {
    return Math.floor((Math.random() * to) + from);
}
handlers.PurchaseCharacter = function (args) {
    log.info("PlayFabId " + currentPlayerId);
    log.info("ClassType " + args.ClassType);
    log.info("ClassStatus " + args.ClassStatus);
    var classType = args.ClassType;

    var gemPrice = args.GemPrice;
    log.info("gemPrice " + gemPrice);
    var allChars = server.GetAllUsersCharacters({
        "PlayFabId": currentPlayerId
    });
    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    var currentGem = userInv.VirtualCurrency.GP;
    if (currentGem < gemPrice) {
        return { "Error": "Insufficient Gem" };
    }
    if (gemPrice > 0) {
        server.SubtractUserVirtualCurrency(
            {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": "GP",
                "Amount": gemPrice
            }
        );
    }

    var grantCharResult = server.GrantCharacterToUser({
        "PlayFabId": currentPlayerId,
        "CatalogVersion": catalogVersion,
        "CharacterName": classType,
        "CharacterType": classType,
        "ItemId": classType
    });
    var characterId = grantCharResult.CharacterId;
    log.info("characterId " + characterId);
    var classStatus = JSON.parse(args.ClassStatus);
    var luck = classStatus["Luck"];
    delete classStatus.Luck;
    server.UpdateCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "Data": classStatus,
        "Permission": "Public"
    });
    var isActive = allChars.Characters.length <= 1;
    var isLeader = allChars.Characters.length == 0;
    server.UpdateCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "Data": { "Luck": luck, "IsActive": isActive, "IsLeader": isLeader, "Level": 0 },
        "Permission": "Public"
    });
    server.UpdateCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "Data": { "Rank": 0, "SoulHitPointLevel": 0 },
        "Permission": "Public"
    });
    var itemId = "";
    if (classType == "Rogue") {
        itemId = "Dagger_00";
    }
    else if (classType == "Hunter") {
        itemId = "Bow_00";
    }
    else if (classType == "Warrior" || classType == "SpellSword" || classType == "Paladin") {
        itemId = "TwoHandSword_00";
    }
    else if (classType == "Sorcerer" || classType == "Warlock" || classType == "Priest") {
        itemId = "Staff_00";
    }

    log.info("itemId " + itemId);
    var itemGrantResult = server.GrantItemsToCharacter({
        "Annotation": "Char Creation Basic Item",
        "CatalogVersion": catalogVersion,
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "ItemIds": [itemId]
    });
    log.info("grantItemResult " + JSON.stringify(itemGrantResult));
    var grantedItems = itemGrantResult["ItemGrantResults"];
    for (var i = 0; i < grantedItems.length; i++) {
        updateItemData(grantedItems[i], characterId);
    }
    return { "CharacterId": characterId };
};
function updateItemData(item, characterId, mainFeature) {
    log.info("updateItemData " + JSON.stringify(item));

    var str = item.ItemId;
    var rank = str.substring(str.lastIndexOf("_") + 1, str.lastIndexOf("_") + 2);
    rank = parseInt(rank);
    var chance = Math.min((rank + 1), 4);
    //var newItemId = str.substr(0, str.lastIndexOf("_")) + "_" + rank + str.substr(str.lastIndexOf("_") + 2);
    var weaponMainOptions = ["AttackPower", "CoolTimeReduction", "AttackSpeed", "CriticalChance", "CriticalDamage", "SoulGain"];
    var armorMainOptions = ["MoveSpeed", "ArmorClass", "MagicResistance", "HitPoint", "SoulGain"];
    var accessoryMainOptions = ["AttackPower", "ArmorClass", "MagicResistance", "CriticalChance", "CriticalDamage", "SoulGain"];
    var commonOptions = ["AttackPower", "CoolTimeReduction", "AttackSpeed", "MoveSpeed", "ArmorClass", "MagicResistance", "HitPoint", "CriticalChance", "CriticalDamage", "SoulGain"];
    var fArray = [];
    var customData = { "Enchant": "0" };
    fArray.push({ "Key": "Enchant", "Value": "0" });
    for (var i = 0; i < chance; i++) {
        if (item.ItemClass == "Weapon") {
            var picked = weaponMainOptions[Math.floor(Math.random() * weaponMainOptions.length)];
            if (i == 0) {
                if (mainFeature != null) {
                    picked = mainFeature;
                }
                customData["Main"] = picked;
                fArray.push({ "Key": "Main", "Value": picked });
                customData[picked] = rand(100, (rank + 1) * 100).toString();
                fArray.push({ "Key": picked, "Value": customData[picked] });
            }
            else {
                customData[picked] = rand(100, (rank) * 100).toString();
                fArray.push({ "Key": picked, "Value": customData[picked] });
            }
            weaponMainOptions.splice(weaponMainOptions.indexOf(picked), 1);
        }
        else if (item.ItemClass == "Armor") {
            var picked = armorMainOptions[Math.floor(Math.random() * armorMainOptions.length)];
            if (i == 0) {
                if (mainFeature != null) {
                    picked = mainFeature;
                }
                customData["Main"] = picked;
                fArray.push({ "Key": "Main", "Value": picked });
                customData[picked] = rand(100, (rank + 1) * 100).toString();
                fArray.push({ "Key": picked, "Value": customData[picked] });
            }
            else {
                customData[picked] = rand(100, (rank) * 100).toString();
                fArray.push({ "Key": picked, "Value": customData[picked] });
            }

            armorMainOptions.splice(armorMainOptions.indexOf(picked), 1);
        }
        else {
            var picked = "";
            if (i == 0) {
                if (mainFeature != null) {
                    picked = mainFeature;
                }
                picked = accessoryMainOptions[Math.floor(Math.random() * accessoryMainOptions.length)];
                customData["Main"] = picked;
                fArray.push({ "Key": "Main", "Value": picked });
                customData[picked] = rand(100, (rank + 1) * 100).toString();
                fArray.push({ "Key": picked, "Value": customData[picked] });
            }
            else {
                picked = commonOptions[Math.floor(Math.random() * commonOptions.length)];
                customData[picked] = rand(100, (rank) * 100).toString();
                fArray.push({ "Key": picked, "Value": customData[picked] });
            }

            accessoryMainOptions.splice(accessoryMainOptions.indexOf(picked), 1);
            commonOptions.splice(commonOptions.indexOf(picked), 1);
        }
    }
    var cData = {};
    for (var i = 0; i < fArray.length; i++) {
        cData[fArray[i].Key] = fArray[i].Value;
        if (i > 0 && i % 4 == 0) {
            var updateData = {
                PlayFabId: currentPlayerId,
                ItemInstanceId: item.ItemInstanceId,
                Data: cData,
            };
            if (characterId != null) {
                updateData["CharacterId"] = characterId;
            }
            var result = server.UpdateUserInventoryItemCustomData(updateData);
            cData = {};
        }
    }
    if (Object.keys(cData).length > 0 && Object.keys(cData).length < 5) {
        var updateData = {
            PlayFabId: currentPlayerId,
            ItemInstanceId: item.ItemInstanceId,
            Data: cData,
        };
        if (characterId != null) {
            updateData["CharacterId"] = characterId;
        }
        var result = server.UpdateUserInventoryItemCustomData(updateData);
        log.info("commit " + JSON.stringify(cData));
    }

    item["CustomData"] = customData;
    return item;
}
handlers.ClearLevel = function (args)
{
    var townLevel = parseInt(args.TownLevel);
    var dungeonLevel = parseInt(args.DungeonLevel);
    var townId = "Town_" + townLevel + "" + parseInt(dungeonLevel / 30);
    log.info("townId " + townId);
    var items = [];
    var realItems = [];
    for(var i = 0; i < 5; i++)
    {
        var townItem = server.EvaluateRandomResultTable(
            {
                "CatalogVersion": catalogVersion,
                "PlayFabId": currentPlayerId,
                "TableId": townId
            }
        );
        if (townItem.ResultItemId != "Nothing") {
            log.info("item " + JSON.stringify(townItem));
            items.push(townItem.ResultItemId);
        }
    }
    if (items.length > 0) {
        var itemGrantResult = server.GrantItemsToUser(
            {
                "CatalogVersion": catalogVersion,
                "PlayFabId": currentPlayerId,
                "ItemIds": items
            }
        );
        var grantedItems = itemGrantResult["ItemGrantResults"];
        for (var i = 0; i < grantedItems.length; i++) {
            var str = grantedItems[i].ItemId;
            if (str.includes("GarbageItem") || str.includes("Bundle")) {
                realItems.push(grantedItems[i]);
            }
            else
            {
                realItems.push(updateItemData(grantedItems[i]));
            }
        }
    }
    var result = {};
    if (realItems.length > 0)
    {
        result.Items = realItems;
    }
    return result;
};
handlers.GetDropItems = function (args) {
    var dropTable = server.GetRandomResultTables(
        {
            "CatalogVersion": catalogVersion,
            "TableIDs": JSON.parse(args.TownIds)
        }
    );
    return dropTable;
};
handlers.SpendEnergyPoint = function (args) {
    log.info("SpendEnergyPoint called PlayFabId " + currentPlayerId);
    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });

    var raidPoint = args.RaidPoint;
    var adventurePoint = args.AdventurePoint;
    if (raidPoint != null) {
        var currentRaidPoint = userInv.VirtualCurrency.RP;
        if (currentRaidPoint < raidPoint) {
            return { "Error": "Insufficient Energy" };
        }
        server.SubtractUserVirtualCurrency(
            {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": "RP",
                "Amount": raidPoint
            }
        );
        return { Total: (currentRaidPoint - raidPoint) };
    }
    else if (adventurePoint != null) {
        log.info("adventurePoint " + adventurePoint);

        var baseEnergy = userInv.VirtualCurrency.BE;
        var additionalEnergy = userInv.VirtualCurrency.AE;
        log.info("baseEnergy " + baseEnergy);
        log.info("additionalEnergy " + additionalEnergy);

        if ((baseEnergy + additionalEnergy) < adventurePoint) {
            return { "Error": "Insufficient Energy" };
        }

        if (additionalEnergy >= adventurePoint) {
            server.SubtractUserVirtualCurrency(
                {
                    "PlayFabId": currentPlayerId,
                    "VirtualCurrency": "AE",
                    "Amount": adventurePoint
                }
            );
            additionalEnergy -= adventurePoint;
        }
        else {
            //adventurePoint 10
            //additionalEnergy 4
            if (additionalEnergy > 0) {
                server.SubtractUserVirtualCurrency(
                    {
                        "PlayFabId": currentPlayerId,
                        "VirtualCurrency": "AE",
                        "Amount": additionalEnergy
                    }
                );
            }
            var beToSubtract = adventurePoint - additionalEnergy;
            //beToSubtract 6
            server.SubtractUserVirtualCurrency(
               {
                   "PlayFabId": currentPlayerId,
                   "VirtualCurrency": "BE",
                   "Amount": beToSubtract
               }
           );
            baseEnergy -= beToSubtract;
            additionalEnergy = 0;
        }
        return { Total: (additionalEnergy + baseEnergy) };
    }
};
handlers.GetEnergyPoint = function (args) {
    log.info("GetEnergyPoint called PlayFabId " + currentPlayerId);

    var userData = server.GetUserData(
        {
            "PlayFabId": currentPlayerId,
            "Keys": [
                "LastEnergyRequestTime",
                "UserLevel"
            ],
        }
    );
    var currentTime = new Date().getTime();
    var lastUserCheckTime;
    if (userData.Data.LastEnergyRequestTime == null) {
        log.info("Need to add currentTime as LastEnergyRequestTime " + currentTime);
        var updatedUserData = server.UpdateUserData(
        {
            "PlayFabId": currentPlayerId,
            "Data": {
                "LastEnergyRequestTime": currentTime + ''
            }
        });
        log.info("UpdateResult " + JSON.stringify(updatedUserData));
        lastUserCheckTime = currentTime;
    }
    else {
        lastUserCheckTime = parseInt(userData.Data.LastEnergyRequestTime.Value);
        log.info("LastEnergyRequestTime " + lastUserCheckTime);
    }
    var diff = currentTime - lastUserCheckTime;
    var fiveMin = 1000 * 60 * 5;
    log.info("diff " + diff + " fiveMin " + fiveMin);

    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    var userLevel = 0;
    if (userData.Data.UserLevel == null) {
        log.info("Need to add UserLevel");
        var updatedUserData = server.UpdateUserData(
        {
            "PlayFabId": currentPlayerId,
            "Data": {
                "UserLevel": 0
            }
        });
        log.info("UpdateResult " + JSON.stringify(updatedUserData));
        userLevel = 0;
    }
    else {
        userLevel = parseInt(userData.Data.UserLevel.Value);
        log.info("userLevel " + userLevel);
    }

    var baseEnergy = userInv.VirtualCurrency.BE;
    var baseEnergyMax = 56;
    var additionalEnergy = userInv.VirtualCurrency.AE;
    var additionalEnergyMax = userLevel * 2;
    log.info("baseEnergy " + baseEnergy);
    log.info("baseEnergyMax " + baseEnergyMax);
    log.info("additionalEnergy " + additionalEnergy);
    log.info("additionalEnergyMax " + additionalEnergyMax);

    var countToAdd = parseInt(diff / fiveMin);
    var timeSecondsLeftTillNextGen = diff % fiveMin;
    timeSecondsLeftTillNextGen = fiveMin - timeSecondsLeftTillNextGen;
    log.info("countToAdd " + countToAdd);
    timeSecondsLeftTillNextGen = Math.ceil(timeSecondsLeftTillNextGen / 1000);
    log.info("timeLeftTillNextGen " + timeSecondsLeftTillNextGen);

    var newLastUserCheckTime = currentTime - (diff % fiveMin);
    var isUpdated = false;

    if (countToAdd > 0) {
        //need to add
        log.info("Need to add " + countToAdd);

        if (baseEnergy >= baseEnergyMax) {
            log.info("baseEnergy is full " + baseEnergy);
            if (additionalEnergy >= additionalEnergyMax) {
                log.info("additionalEnergy is full " + additionalEnergy + " nothing to do");
                isUpdated = true;
            }
            else {
                //additionalEnergy 11 / max : 20
                //9 20
                var additionalDiff = additionalEnergyMax - additionalEnergy;
                additionalDiff = Math.min(additionalDiff, countToAdd);

                server.AddUserVirtualCurrency(
                    {
                        "PlayFabId": currentPlayerId,
                        "VirtualCurrency": "AE",
                        "Amount": additionalDiff
                    }
                );

                additionalEnergy += additionalDiff;
                log.info("added " + additionalDiff + " to additionalEnergy, now " + additionalEnergy);

                isUpdated = true;
            }
        }
        else {
            //baseEnergyMax = 20
            //baseEnergy = 11
            //countToAdd = 20
            //spaceOnBase = 9
            //valueToAddToBase = 9
            //valueToAddToAdditional = 11
            var spaceOnBase = baseEnergyMax - baseEnergy;
            var valueToAddToBase = Math.min(spaceOnBase, countToAdd);
            var valueToAddToAdditional = countToAdd - valueToAddToBase;

            if (valueToAddToBase > 0) {
                server.AddUserVirtualCurrency(
                   {
                       "PlayFabId": currentPlayerId,
                       "VirtualCurrency": "BE",
                       "Amount": valueToAddToBase
                   }
                );
                baseEnergy += valueToAddToBase;
                log.info("added " + valueToAddToBase + " to baseEnergy, now " + baseEnergy);
                isUpdated = true;
            }

            var additionalDiff = additionalEnergyMax - additionalEnergy;
            additionalDiff = Math.min(additionalDiff, valueToAddToAdditional);
            if (additionalDiff > 0) {
                server.AddUserVirtualCurrency(
                   {
                       "PlayFabId": currentPlayerId,
                       "VirtualCurrency": "AE",
                       "Amount": additionalDiff
                   }
                );
                additionalEnergy += additionalDiff;
                log.info("added " + additionalDiff + " to additionalEnergy, now " + additionalEnergy);
                isUpdated = true;
            }
        }
    }
    if (isUpdated) {
        var updatedUserData = server.UpdateUserData({
            "PlayFabId": currentPlayerId,
            "Data": {
                "LastEnergyRequestTime": newLastUserCheckTime + ''
            }
        });
    }

    return { Current: (additionalEnergy + baseEnergy), Max: (baseEnergyMax + additionalEnergyMax), TimeSecondsLeftTillNextGen: timeSecondsLeftTillNextGen };
};
handlers.CharLevelUp = function (args) {
    log.info("GetEnergyPoint called PlayFabId " + currentPlayerId);
    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    var price = parseInt(args.GD);
    var currentGD = userInv.VirtualCurrency.GD;
    if (currentGD < price) {
        return { "Error": "Insufficient Gem" };
    }
    if (price > 0) {
        server.SubtractUserVirtualCurrency(
            {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": "GD",
                "Amount": price
            }
        );
    }
    server.UpdateCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": args.CharacterId,
        "Data": { "Level": args.Level },
        "Permission": "Public"
    });
    return {};
};
handlers.CharGradeUp = function (args) {
    log.info("GetEnergyPoint called PlayFabId " + currentPlayerId);
    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    var price = parseInt(args.GD);
    var currentGD = userInv.VirtualCurrency.GD;
    if (currentGD < price) {
        return { "Error": "Insufficient Gem" };
    }
    if (price > 0) {
        server.SubtractUserVirtualCurrency(
            {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": "GD",
                "Amount": price
            }
        );
    }

    var itemList = JSON.parse(args.Items);
    for (var i = 0; i < itemList.length; i++)
    {
        var item = itemList[i];
        server.ConsumeItem({
            "PlayFabId": currentPlayerId,
            "ItemInstanceId": item.ItemId,
            "ConsumeCount": item.Count,
        });
    }

    server.UpdateCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": args.CharacterId,
        "Data": { "Rank": args.Rank },
        "Permission": "Public"
    });
    return {};
};
handlers.SkillLevelStatus = function (args) {
    log.info("GetEnergyPoint called PlayFabId " + currentPlayerId);
    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    var price = parseInt(args.GD);
    var currentGD = userInv.VirtualCurrency.GD;
    if (currentGD < price) {
        return { "Error": "Insufficient Gem" };
    }
    if (price > 0) {
        server.SubtractUserVirtualCurrency(
            {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": "GD",
                "Amount": price
            }
        );
    }

    var itemList = JSON.parse(args.Items);
    for (var i = 0; i < itemList.length; i++) {
        var item = itemList[i];
        server.ConsumeItem({
            "PlayFabId": currentPlayerId,
            "ItemInstanceId": item.ItemId,
            "ConsumeCount": item.Count,
        });
    }
    var updatedUserData = server.UpdateUserData(
    {
        "PlayFabId": currentPlayerId,
        "Data": {
            "SkillLevelStatus": args.SkillLevelStatus
        }
    });
    return {};
};
handlers.DecomposeItems = function (args) {
    var items = JSON.parse(args.Items);
    var totalPrice = 0;
    for (var i = 0; i < items.length; i++) {
        var itemInstance = items[i];
        server.RevokeInventoryItem({
            "PlayFabId": currentPlayerId,
            "ItemInstanceId": itemInstance.ItemInstanceId,
        });
        totalPrice += itemInstance.UnitPrice;
    }
    var goldGainResult = server.AddUserVirtualCurrency(
        {
            "PlayFabId": currentPlayerId,
            "VirtualCurrency": "GD",
            "Amount": totalPrice
        }
    );
    return { "GD": totalPrice };
};
handlers.EquipItem = function (args) {
    var itemSwapInfos = JSON.parse(args.ItemSwapInfo);
    for (var i = 0; i < itemSwapInfos.length; i++) {
        var itemSwapInfo = itemSwapInfos[i];
        //unequip
        if (itemSwapInfo.PrevItemInstanceId != "") {
            itemSwapInfo.PlayFabId = currentPlayerId;
            itemSwapInfo.CharacterId = args.CharacterId;
            handlers.UnEquipItem(itemSwapInfo);
        }
        //equip
        server.MoveItemToCharacterFromUser({
            "PlayFabId": currentPlayerId,
            "CharacterId": args.CharacterId,
            "ItemInstanceId": itemSwapInfo.ItemToEquipInstanceId
        });
    }
};
handlers.UnEquipItem = function (args) {
    server.MoveItemToUserFromCharacter({
        "PlayFabId": currentPlayerId,
        "CharacterId": args.CharacterId,
        "ItemInstanceId": args.PrevItemInstanceId
    });
};
handlers.PvPResult = function (args) {
    log.info("PvPResult " + currentPlayerId);
    var pvpResult = args.PvPResult;
    var enemyId = pvpResult.Defender.PlayFabId;
    log.info(pvpResult.When);
    var myScore = getScore(currentPlayerId);
    var enemyScore = getScore(enemyId);
    var myElo = 1 / (1 + Math.pow(10, (enemyScore - myScore) / 400));
    var enemyElo = 1 / (1 + Math.pow(10, (myScore - enemyScore) / 400));
    var myS = 0;
    var enemyS = 0;
    var k = 10;
    if (pvpResult.Result == 0)
    {
        myS = 1;
        enemyS = 0;
    }
    else if (pvpResult.Result == 1) {
        myS = 0;
        enemyS = 1;
    }
    else
    {
        myS = 0.5;
        enemyS = 0.5;
    }
    var myRC = Math.ceil(k * (myS - myElo));
    var enemyRC = Math.ceil(k * (enemyS - enemyElo));

    updateScore(currentPlayerId, myScore + myRC);
    updateScore(enemyId, enemyScore + enemyRC);
    log.info("myElo " + myElo);
    log.info("enemyElo " + enemyElo);
    log.info("myRC " + myRC);
    log.info("enemyRC " + enemyRC);

    pvpResult.Attacker.Diff = myRC;
    pvpResult.Defender.Diff = enemyRC;

    mergeResult(currentPlayerId, pvpResult);
    mergeResult(enemyId, pvpResult);
    return { "MyRC": myRC, "EnemyRC": enemyRC };
};
function mergeResult(playFabId, pvpResult)
{
    var userData = server.GetUserData({
        "PlayFabId": playFabId,
        "Keys": [
            "PvPResults",
        ],
    });
    var results = [];
    if (userData.Data.PvPResults != null)
    {
        results = JSON.parse(tuserData.Data.PvPResults.replace(/\\/g, ""));
    } 
    if (results.length >= 10)
    {
        results.shift();
    }
    results.push(pvpResult);
    server.UpdateUserData(
    {
        "PlayFabId": playFabId,
        "Data": {
            "PvPResults": JSON.stringify(results)
        },
        "Permission": "Public"
    });
}
function updateScore(playFabId, score) {
    server.UpdatePlayerStatistics({
        "PlayFabId": playFabId,
        "Statistics": [
            {
                "StatisticName": "PvPRanking",
                "Value": score
            }
        ],
    });
}
function getScore(playFabId)
{
    var myStat = server.GetPlayerStatistics({
        "PlayFabId": playFabId,
        "StatisticNames": [
            "PvPRanking",
        ],
    });
    return parseInt(myStat.Statistics[0].Value);
}