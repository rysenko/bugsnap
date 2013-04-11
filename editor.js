$(function () {
    var GeminiCommunicator = (function () {
        function GeminiCommunicator() {
            this.geminiUrl = "http://pxaltair/gemini/api/";
            this.geminiUsername = $.base64.btoa('manager:wzhhx2ratj'); // user:apikey
        }
        GeminiCommunicator.prototype.search = function (query) {
            return $.ajax({
                url: this.geminiUrl + "items/filtered",
                type: "POST",
                data: {
                    SearchKeywords: query,
                    IncludeClosed: "false",
                    Projects: "ALL"
                },
                headers: { "Authorization": "Basic " + this.geminiUsername }
            });
        };
        GeminiCommunicator.prototype.comment = function (projectId, issueId, comment) {
            return $.ajax({
                url: this.geminiUrl + "items/" + issueId + "/comments",
                type: "POST",
                data: {
                    ProjectId: projectId,
                    IssueId: issueId,
                    UserId: "1",
                    Comment: comment
                },
                headers: { "Authorization": "Basic " + this.geminiUsername }
            });
        };
        GeminiCommunicator.prototype.attach = function (projectId, issueId, fileContent) {
            return $.ajax({
                url: this.geminiUrl + "items/" + issueId + "/attachments",
                type: "POST",
                data: {
                    ProjectId: projectId,
                    IssueId: issueId,
                    UserId: "1",
                    Name: "screenshot.png",
                    Content: fileContent,
                    ContentType: "image/png"
                },
                headers: { "Authorization": "Basic " + this.geminiUsername }
            });
        };
        return GeminiCommunicator;
    })();

    var DetailsViewModel = (function () {
        function DetailsViewModel(options) {
            this.Parent = options.Parent;
            this.Comment = ko.observable();
            this.IssueId = ko.observable();
            this.ProjectId = ko.observable();
        }
        DetailsViewModel.prototype.send = function () {
            var imageData = this.Parent.Editor.getImageData();
        };
        return DetailsViewModel;
    })();

    var EditorViewModel = (function () {
        function EditorViewModel(options) {
            this.Parent = options.Parent;
            this.ActiveInstrument = ko.observable('Pointer');
            this.ActiveObject = ko.observable();
            this.ActiveColor = ko.observable('black');
            this.IsDrawing = ko.observable(false);
            this.StartPoint = ko.observable();
            this.IsTextMode = ko.computed(function () {
                return this.ActiveInstrument() == 'Text';
            }, this);
            this.ActiveText = ko.observable();
            this.ActiveText.subscribe(function (value) {
                this.ActiveObject().attr('text', value);
            }, this);
            this.init();
        }
        EditorViewModel.prototype.init = function () {
            var fillWindow = function (canvas) {
                canvas.width  = window.innerWidth;
                canvas.height = window.innerHeight;
            };
            var canvas = document.getElementById('canvas');
            fillWindow(canvas);
            fillWindow(document.getElementById("output"));
            var context = canvas.getContext('2d');
            var imageObj = new Image();
            imageObj.onload = function() {
                context.drawImage(this, 0, 0);
            };
            imageObj.src = localStorage.getItem('screenshot');
            this.Paper = new Raphael(document.getElementById('editor'), window.innerWidth, window.innerHeight);
        };
        EditorViewModel.prototype.setPointer = function () {
            this.ActiveInstrument('Pointer');
        };
        EditorViewModel.prototype.setRectangle = function () {
            this.ActiveInstrument('Rectangle');
        };
        EditorViewModel.prototype.setArrow = function () {
            this.ActiveInstrument('Arrow');
        };
        EditorViewModel.prototype.setText = function () {
            this.ActiveInstrument('Text');
        };
        EditorViewModel.prototype.editorDown = function (data, event) {
            this.IsDrawing(true);
            this.StartPoint({x: event.offsetX, y: event.offsetY});
            var activeInstrument = this.ActiveInstrument();
            var activeObject = null;
            if (activeInstrument == 'Rectangle') {
                activeObject = this.Paper.rect(event.offsetX, event.offsetY, 0, 0);
            } else if (activeInstrument == 'Arrow') {
                activeObject = this.Paper.path('M0,0');
            } else if (activeInstrument == 'Text') {
                var textEditor = $('#texted');
                activeObject = this.Paper.text(event.offsetX, event.offsetY, '');
                $(activeObject[0]).css({'text-anchor': 'start', 'font-size': '16px', 'font-family': 'Arial'});
                textEditor.val('').focus();
                textEditor.css({'left': event.clientX, 'top': event.clientY - 9, 'font-size': '16px', 'font-family': 'Arial'});
            }
            if (activeInstrument != 'Text') {
                activeObject.attr('stroke', this.ActiveColor());
                activeObject.attr('stroke-width', '3');
            }
            this.ActiveObject(activeObject);
        };
        EditorViewModel.prototype.editorMove = function (data, event) {
            var activeObject = this.ActiveObject();
            if (this.IsDrawing() && activeObject) {
                var startPoint = this.StartPoint();
                if (this.ActiveInstrument() == 'Rectangle') {
                    var minX = Math.min(startPoint.x, event.offsetX);
                    var maxX = Math.max(startPoint.x, event.offsetX);
                    var minY = Math.min(startPoint.y, event.offsetY);
                    var maxY = Math.max(startPoint.y, event.offsetY);
                    activeObject.attr('x', minX);
                    activeObject.attr('y', minY);
                    activeObject.attr('width', maxX - minX);
                    activeObject.attr('height', maxY - minY);
                } else if (this.ActiveInstrument() == 'Arrow') {
                    var arrowPath = function(x1, y1, x2, y2, size) {
                        var angle = Raphael.angle(x1, y1, x2, y2);
                        var a45   = Raphael.rad(angle-45);
                        var a45m  = Raphael.rad(angle+45);
                        var x2a = x2 + Math.cos(a45) * size;
                        var y2a = y2 + Math.sin(a45) * size;
                        var x2b = x2 + Math.cos(a45m) * size;
                        var y2b = y2 + Math.sin(a45m) * size;
                        return "M"+x1+" "+y1+"L"+x2+" "+y2+
                            "M"+x2+" "+y2+"L"+x2a+" "+y2a+
                            "M"+x2+" "+y2+"L"+x2b+" "+y2b;
                    };
                    activeObject.attr('path', arrowPath(startPoint.x, startPoint.y, event.offsetX, event.offsetY, 10));
                }
            }
        };
        EditorViewModel.prototype.editorUp = function (data, event) {
            if (!this.IsTextMode()) {
                this.IsDrawing(false);
                this.ActiveObject(null);
            }
        };
        EditorViewModel.prototype.getImageData = function () {
            var output = document.getElementById('output');
            canvg(output, document.getElementById('editor').outerHTML);
            var img = output.toDataURL("image/png");
            return img; // TODO: Convert to binary
        };
        return EditorViewModel;
    })();

    var PageViewModel = (function () {
        function PageViewModel() {
            this.Details = new DetailsViewModel({Parent: this});
            this.Editor = new EditorViewModel({Parent: this});
        }
        return PageViewModel;
    })();
    ko.applyBindings(new PageViewModel());
});
