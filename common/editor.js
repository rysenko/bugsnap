requirejs.config({
   shim: {
        'js/jquery.ui.src': {deps: ['js/jquery.src']}
   }
});

define(['js/jquery', 'js/knockout', 'js/raphael', 'js/canvg', 'gemini', 'js/jquery.ui'], function ($, ko, Raphael, canvg, GeminiCommunicator) {

    var isFF = window.navigator.userAgent.indexOf('Firefox') != -1;

    var DetailsViewModel = (function () {
        function DetailsViewModel(options) {
            this.Parent = options.Parent;
            this.Comment = ko.observable();
            this.Issue = ko.observable();
            this.IssueId = ko.computed(function () {
                var issue = this.Issue();
                if (issue != null) {
                    return issue.Id;
                }
                return null;
            }, this);
            this.ProjectId = ko.computed(function () {
                var issue = this.Issue();
                if (issue != null) {
                    return issue.Project.Id;
                }
                return null;
            }, this);
            this.Communicator = new GeminiCommunicator();
            this.init();
        }
        DetailsViewModel.prototype.init = function () {
            var self = this;
            $("#toolbar > a").button();
            $("#issue").autocomplete({
                appendTo: "#issue_dialog",
                minLength: 1,
                source: function(request, response) {
                   var search = self.Communicator.search(request.term)
					if (search != null) {
						search.done(function (data) {
							if(data.constructor != Array) {
								data = new Array(data);
							}
							var labeledData = $.map(data, function (item) {
								item.label = item.IssueKey + " " + item.Title;
								item.value = item.Id;
								return item;
							})
							response(labeledData);
						});
					}
                },
                focus: function( event, ui ) {
                    $("#issue").val(ui.item.label);
                    return false;
                },
                select: function(event, ui) {
                    $("#issue").val(ui.item.label);
                    self.Issue(ui.item); // Use ui.item.Title and ui.item.Priority
                    return false;
                }
            });
            $("#issue_dialog").dialog(
                { 
                    autoOpen: false,
                    width: 500, 
                    height: 500
                }
            );
        };
        DetailsViewModel.prototype.send = function () {
            if (this.Issue() != null) {
                var imageData = this.Parent.Editor.getImageData();
                var self = this;
                $("#issue_dialog").addClass("loading");
                this.Communicator.comment(this.ProjectId(), this.IssueId(), this.Comment()).then(function () {
                    return self.Communicator.attach(self.ProjectId(), self.IssueId(), imageData);
                }).done(function () {
                   $("#issue_dialog").removeClass("loading").dialog("close");
                });
            }
        };
        return DetailsViewModel;
    })();

    var EditorViewModel = (function () {
        function EditorViewModel(options) {
            this.Parent = options.Parent;
            this.ActiveInstrument = ko.observable('Pointer');
            this.ActiveObject = ko.observable();
            this.ActiveColor = ko.observable('Red');
            this.IsDrawing = ko.observable(false);
            this.StartPoint = ko.observable();
            this.IsTextMode = ko.computed(function () {
                return this.ActiveInstrument() == 'Text';
            }, this);
            this.ActiveText = ko.observable();
            this.ActiveText.subscribe(function (value) {
                var activeText = this.ActiveObject();
                activeText.attr('text', value);
                for (var i = 0; i < activeText[0].childNodes.length; i++) {
                    activeText[0].childNodes[i].setAttribute('dy', '19');
                }
                activeText[0].firstChild.setAttribute('dy', '0');
            }, this);
            this.Offset = ko.observable({x: 0, y: 0});
            this.Colors = ko.observableArray(['Red', 'Orange', 'Green', 'Blue']);
            var self = this;
            this.setColor = function (color) {
                self.ActiveColor(color);
            };
            this.init();
        }
        EditorViewModel.prototype.init = function () {
            var screenshotUrl = localStorage.getItem('screenshot');
            if (screenshotUrl) {
                var fillWindow = function (canvas) {
                    canvas.width  = window.innerWidth;
                    canvas.height = window.innerHeight;
                };
                var canvas = document.getElementById('canvas');
                var output = document.getElementById('output');
                fillWindow(canvas);
                fillWindow(output);
                var imageObj = new Image();
                imageObj.onload = function() {
                    canvas.getContext('2d').drawImage(this, 0, 0);
                    output.getContext('2d').drawImage(this, 0, 0);
                };
                imageObj.src = screenshotUrl;
                if (isFF) {
                    localStorage.removeItem("screenshot");
                }
                this.Paper = new Raphael(document.getElementById('editor'), window.innerWidth, window.innerHeight);
            } else {
                setTimeout(this.init.bind(this), 100);
            }
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
        EditorViewModel.prototype.setCrop = function () {
            this.ActiveInstrument('Crop');
        };
        EditorViewModel.prototype.getOffset = function (event) {
            var initialOffset = this.Offset();
            return {
                     x: initialOffset.x + (isFF ? event.layerX : event.offsetX),
                     y: initialOffset.y + (isFF ? event.layerY :event.offsetY)
                   };
        };
        EditorViewModel.prototype.editorDown = function (data, event) {
            this.IsDrawing(true);
            var offset = this.getOffset(event);
            this.StartPoint({x: offset.x, y: offset.y});
            var activeInstrument = this.ActiveInstrument();
            var activeObject = null;
            if (activeInstrument == 'Rectangle') {
                activeObject = this.Paper.rect(offset.x, offset.y, 0, 0);
            } else if (activeInstrument == 'Arrow') {
                activeObject = this.Paper.path('M0,0');
            } else if (activeInstrument == 'Text') {
                var textEditor = $('#texted');
                activeObject = this.Paper.text(offset.x, offset.y, '');
                activeObject.attr('text-anchor', 'start');
                $(activeObject[0]).css({
                    'font-size': '16px',
                    'font-family': 'Arial'});
                textEditor.val('').focus();
                textEditor.css({
                    left: event.clientX - (isFF ? 1 : 0),
                    top: event.clientY - 15 - (isFF ? 1 : 0),
                    'font-size': '16px',
                    'font-family': 'Arial',
                    color: this.ActiveColor(),
                    width: this.Paper.width - event.clientX
                });
            } else if (activeInstrument == 'Crop') {
                activeObject = this.Paper.rect(offset.x, offset.y, 0, 0);
                activeObject.attr({
                    'stroke' : '#777',
                    'stroke-dasharray' : '--.',
                    'stroke-width': 2,
                    'fill': 'Gray',
                    'fill-opacity': 0.1
                });
            }
            if (activeInstrument == 'Text') {
                activeObject.attr('fill', this.ActiveColor());
            } else if (activeInstrument != 'Crop') {
                activeObject.attr('stroke', this.ActiveColor());
                activeObject.attr('stroke-width', 3);
            }
            this.ActiveObject(activeObject);
        };
        EditorViewModel.prototype.editorMove = function (data, event) {
            var activeObject = this.ActiveObject();
            var offset = this.getOffset(event);
            if (this.IsDrawing() && activeObject) {
                var startPoint = this.StartPoint();
                if (this.ActiveInstrument() == 'Rectangle' || this.ActiveInstrument() == 'Crop') {
                    var minX = Math.min(startPoint.x, offset.x);
                    var maxX = Math.max(startPoint.x, offset.x);
                    var minY = Math.min(startPoint.y, offset.y);
                    var maxY = Math.max(startPoint.y, offset.y);
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
                    activeObject.attr('path', arrowPath(startPoint.x, startPoint.y, offset.x, offset.y, 10));
                }
            }
        };
        EditorViewModel.prototype.editorUp = function (data, event) {
            if (this.ActiveInstrument() == 'Crop') {
                var activeObject = this.ActiveObject();
                var x = activeObject.attr('x'), y = activeObject.attr('y');
                var width = activeObject.attr('width'), height = activeObject.attr('height');
                var self = this;
                this.setViewBox(x, y, width, height).done(function () {
                    activeObject.remove();
                    self.ActiveInstrument('Pointer');
                });
            }
            if (!this.IsTextMode()) {
                this.IsDrawing(false);
                this.ActiveObject(null);
            }
        };
        EditorViewModel.prototype.setViewBox = function (x, y, width, height) {
            var deferred = $.Deferred();
            this.Paper.setViewBox(x, y, width, height);
            this.Offset({x: x, y: y});
            this.Paper.setSize(width, height);
            var sourceCanvas = document.getElementById('canvas');
            var outputCanvas = document.getElementById('output');
            sourceCanvas.width = width;
            sourceCanvas.height = height;
            outputCanvas.width = width;
            outputCanvas.height = height;
            var imageObj = new Image();
            imageObj.onload = function() {
                sourceCanvas.getContext('2d').drawImage(this, x, y, width, height, 0, 0, width, height);
                outputCanvas.getContext('2d').drawImage(this, x, y, width, height, 0, 0, width, height);
                deferred.resolve();
            };
            imageObj.src = localStorage.getItem('screenshot');
            return deferred.promise();
        };
        EditorViewModel.prototype.getImageData = function () {
            var output = document.getElementById('output');
            canvg(output, document.getElementById('editor').innerHTML, {ignoreDimensions: true, ignoreClear: true});
            var img = output.toDataURL('image/png');
            img = img.replace('data:image/png;base64,', '');
            $("#issue_dialog").dialog("open");
            return img;
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
