define([], function () {
    var HistoryManager = (function () {
        function HistoryManager(options) {
            this.Editor = options.Editor;
            this.Operations = [];
        }
        HistoryManager.prototype.add = function (operation, params) {
            this.Operations.push({operation: operation, params: params});
        };
        HistoryManager.prototype.revert = function () {
            if (this.Operations.length == 0) return;
            var data = this.Operations.pop();
            var operation = data.operation;
            var params = data.params;
            if (operation == 'Crop') {
                this.Editor.setViewBox(params.x, params.y, params.width, params.height);
            } else if (operation == 'Rectangle' || operation == 'Arrow' || operation == 'Text') {
                if (params.obj) {
                    params.obj.remove();
                }
            } else if (operation == 'Move') {
                if (params.obj) {
                    params.obj.transform(params.transform);
                }
            }
        };
        HistoryManager.prototype.drop = function () {
            this.Operations.pop();
        };
        return HistoryManager;
    })();
    return HistoryManager;
});