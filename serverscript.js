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
        "Data": classStatus
    });
    var isActive = allChars.Characters.length <= 1;
    var isLeader = allChars.Characters.length == 0;
    server.UpdateCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "Data": { "Luck": luck, "IsActive": isActive, "IsLeader": isLeader, "Level": 0}
    });
    server.UpdateCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "Data": { "Rank": 0, "SoulHitPointLevel": 0 }
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
handlers.ClearLevel = function (args)
{
    var townLevel = parseInt(args.TownLevel);
    var dungeonLevel = parseInt(args.DungeonLevel);
    var townId = "Town_" + townLevel + "" + parseInt(dungeonLevel / 10);
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
        if (townItem.ResultItemId != "Nothing" && !townItem.ResultItemId.includes("Bundle")) {
            log.info("item " + JSON.stringify(townItem));
            items.push(townItem.ResultItemId);
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
                realItems.push(grantedItems[i]);
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