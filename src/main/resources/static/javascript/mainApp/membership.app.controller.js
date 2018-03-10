(function () {

    // BIG QUESTIONS: why is there so much output for the URL?

    /**
     * Membership controller for the whole memberships page
     *
     * @param $scope - binding between controller and HTML page
     * @param $window - reference to the browser's window
     * @param dataProvider - service function that provides GET and POST requests for getting or updating data
     */
    function MembershipJsController($scope, $window, $uibModal, $filter, dataProvider) {

        $scope.currentUsername = "";
        $scope.membersList = [];
        $scope.optInList = [];
        $scope.optOutList = [];
        $scope.loading = true;

        $scope.symbol = {'member': '', 'optInName': '', 'optInPath': ''};

        //these will be place holders for now
        $scope.pagedItemsMembersList = [];
        $scope.pagedItemsOptInList = [];
        $scope.gap = 2;

        $scope.itemsPerPage = 20;
        $scope.currentPageOptIn = 0;
        $scope.currentPageOptOut = 0;

        $scope.columnSort = {};

        $scope.initCurrentUsername = function () {
            $scope.currentUsername = $window.document.getElementById("name").innerHTML;
        };

        $scope.getCurrentUsername = function () {
            return $scope.currentUsername;
        };

        /**init is something that is usually called at the start of something
         * so calling init would be called at the start
         **/
        $scope.init = function () {
            $scope.initCurrentUsername();
            var groupingURL = "api/groupings/groupingAssignment";
            /**Loads Data into a membersList
             *                  optOutList
             *                  optInList
             *                  optedIn
             *                  optedOut
             *takes all of that data and puts them into pages as called by "groupToPages"
             **/
            dataProvider.loadData(function (d) {
                console.log(d);
                if(typeof d.groupingsIn === 'undefined') {
                    $scope.loading = false;
                    $scope.errorModal();
                }
                else{
                    $scope.membersList = d.groupingsIn;
                    $scope.optOutList = d.groupingsToOptOutOf;
                    $scope.optInList = d.groupingsToOptInTo;

                    $scope.membersList = $scope.sortOrder($scope.membersList, 'name');
                    $scope.optInList = $scope.sortOrder($scope.optInList, 'name');

                    //Sorts tables by name
                    $scope.symbol.member = '\u21c5';
                    $scope.symbolList = '\u25BC';
                    $scope.symbol.optInName = '\u21c5';
                    $scope.symbolOptIn = '\u25BC';

                    if ($scope.optInList.length === 0) {
                        $scope.optInList.push({'name': "NO GROUPINGS TO OPT IN TO"});
                    }

                    $scope.pagedItemsMembersList = $scope.groupToPages($scope.membersList, $scope.pagedItemsMembersList);
                    $scope.pagedItemsOptInList = $scope.groupToPages($scope.optInList, $scope.pagedItemsOptInList);

                    $scope.loading = false;
                }
            }, groupingURL);
        };

        $scope.errorModal = function () {
            $scope.errorModalInstance = $uibModal.open({
                templateUrl: 'modal/apiError.html',
                windowClass: 'center-modal',
                scope: $scope
            });
        };

        $scope.errorDismiss = function() {
            $scope.errorModalInstance.dismiss();
        };

        /**
         * Sorts a table by a given property.
         * @param {string} tableName - the variable name of the table to sort
         * @param pagedTableName - the variable name of the paginated table
         * @param propertyName - the property to sort by
         */
        $scope.sortBy = function (tableName, pagedTableName, propertyName) {
            if (!$scope.columnSort[tableName]) {
                // If the user sorts by name property (typically the first column), then just reverse the direction
                if (propertyName === 'name') {
                    $scope.columnSort[tableName] = { property: 'name', reverse: true };
                } else {
                    // Otherwise, set the new property and sort in ascending order
                    $scope.columnSort[tableName] = { property: propertyName, reverse: false };
                }
            } else {
                // If the property to sort by is the same as what is already stored, then just invert the direction
                if (propertyName === $scope.columnSort[tableName].property) {
                    $scope.columnSort[tableName].reverse = !$scope.columnSort[tableName].reverse;
                } else {
                    // Otherwise, set the new property and sort in ascending order
                    $scope.columnSort[tableName].property = propertyName;
                    $scope.columnSort[tableName].reverse = false;
                }
            }
            var reverse = $scope.columnSort[tableName].reverse;
            $scope[tableName] = $filter('orderBy')($scope[tableName], propertyName, reverse);
            // Paginate the table again
            $scope[pagedTableName] = $scope.groupToPages($scope[tableName], []);
        };

        /**
         * Function that calls the underscore library function sortBy.
         * Standalone function in order to call fake for testing purposes.
         * @param list - The data list to which will be sorted
         * @param col - The object to name to determine how it will be sorted by.
         * @returns the list sorted.
         */
        $scope.sortOrder = function (list, col) {
            return _.sortBy(list, col);
        };

        /**
         * Adds the user to the exclude group of the grouping selected. Sends back an alert saying if it failed.
         * @param {number} index - the index of the grouping clicked by the user
         *
         */
        $scope.optOut = function (index) {
            console.log(index);
            var optOutURL = "api/groupings/" + $scope.pagedItemsMembersList[$scope.currentPageOptOut][index].path + "/optOut";
            $scope.loading = true;
            dataProvider.updateData(function (d) {
                console.log(d);
                if (d[0].resultCode.indexOf("FAILURE") > -1) {
                    console.log("Failed to opt out");
                    alert("Failed to opt out");
                    $scope.loading = false;
                }
                else {
                    $scope.init();
                }
            }, optOutURL);
        };

        /**
         * Adds the user to the include group of the grouping selected.
         * @param {number} index - the index of the grouping clicked by the user
         */
        $scope.optIn = function (index) {
            var optInURL = "api/groupings/" + $scope.pagedItemsOptInList[$scope.currentPageOptIn][index].path + "/optIn";
            console.log(optInURL);
            $scope.loading = true;
            dataProvider.updateData(function (d) {
                $scope.init();
            }, optInURL);
        };

        var searchMatch = function (haystack, needle) {
            if (!needle) {
                return true;
            }
            return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
        };

        /**searches through the array to find matches and then fixes the list
         **@param list - gives the whole list to sort out
         **@param whatList - it gives you the list you need to search through
         **@param whatQuery - it gives the search bar its seperate search function.
         **/
        $scope.search = function (list, whatList, whatQuery) {
            var query = "";
            query = $scope[whatQuery];
            console.log(query);
            $scope.filteredItems = [];
            $scope.filteredItems = $filter('filter')(list, function (item) {
                // Filter by path name for groups in Available Groupings tab
                if (list === $scope.optInList) {
                    if (searchMatch(item.path, query)) {
                        return true;
                    }
                } else {
                    // Otherwise filter by name of grouping for My Grouping Memberships tab
                    if (searchMatch(item.name, query)) {
                        return true;
                    }
                }
            });
            page = 0;
            // now group by pages
            var emptyList = [];
            $scope[whatList] = $scope.groupToPagesChanged(emptyList);
        };


        $scope.groupToPagesChanged = function (pagedList) {
            var pagedList = [];
            for (var i = 0; i < $scope.filteredItems.length; i++) {
                if (i % $scope.itemsPerPage === 0) {
                    pagedList[Math.floor(i / $scope.itemsPerPage)] = [$scope.filteredItems[i]];
                } else {
                    pagedList[Math.floor(i / $scope.itemsPerPage)].push($scope.filteredItems[i]);
                }
            }
            return pagedList;
        };
        //Disables opt in button if there are no groupings to opt into.
        $scope.disableOptIn = function (index) {
            for (var i = 0; i < $scope.membersList.length; i++) {
                if ($scope.membersList[i].name === $scope.optInList[index].name) {
                    return true;
                }
            }
        };

        //Disable button if list is empty
        $scope.disableButton = function (type, index) {
            var list = type[index];
            return list.name.indexOf("NO GROUPINGS TO") > -1;
        };

        /**
         * Function that will show opt out button if true otherwise will not show opt out button
         * @param index - table row
         * @returns {boolean} - if there is a match then return true inorder enable button.
         */
        $scope.required = function (index) {
            for (var i = 0; i < $scope.optOutList.length; i++) {
                if ($scope.pagedItemsMembersList[$scope.currentPageOptOut][index].name === $scope.optOutList[i].name) {
                    return false;
                }
            }
            return true;
        };

        /**groups all the items to pages
         have separate arrays (hopefully)
         @param theList - .
         @param pagedList - .
         **/
        $scope.groupToPages = function (theList, pagedList) {
            var pagedList = [];
            for (var i = 0; i < theList.length; i++) {
                if (i % $scope.itemsPerPage === 0) {
                    pagedList[Math.floor(i / $scope.itemsPerPage)] = [theList[i]];
                } else {
                    pagedList[Math.floor(i / $scope.itemsPerPage)].push(theList[i]);
                }
            }
            return pagedList;
        };


        /**shows the range between the start and end
         *checks for negative numbers
         *
         * @param size
         * @param start
         * @param end
         *  all the param are self explanatory
         * @return ret
         *     everything within the range of start,
         *       end, and making sure it's that size
         **/
        $scope.range = function (size, start, end) {
            var ret = [];

            if (size < end) {
                end = size;
                // start = size - $scope.gap;
            }
            if (start < 0) {
                start = 0;
            }
            for (var i = start; i < end; i++) {
                ret.push(i);
            }
            return ret;
        };


        //might make this into my one function
        $scope.currentPage = function (pages, whatList, whatPage) {
            switch (pages) {
                case 'Next':
                    if ($scope[whatPage] < $scope[whatList].length - 1) {
                        $scope[whatPage] = $scope[whatPage] + 1;
                    }
                    break;

                case 'Set':
                    $scope[whatPage] = this.n;
                    break;

                case 'Prev':
                    if ($scope[whatPage] > 0) {
                        $scope[whatPage]--;
                    }
                    break;
                case 'First':
                    if ($scope[whatPage] > 0) {
                        $scope[whatPage] = 0;
                    }
                    break;
                case 'Last':
                    if ($scope[whatPage] >= 0) {
                        $scope[whatPage] = $scope[whatList].length - 1;
                    }
                    break;
            }
        };

    }

    UHGroupingsApp.controller("MembershipJsController", MembershipJsController);
})();
