requirejs.config({
   shim: {
        'js/jquery.ui.src': {deps: ['js/jquery.src']}
   }
});

define(['js/jquery', 'js/knockout', 'js/raphael', 'js/canvg', 'gemini', 'js/jquery.ui', 'js/jquery.loading'], function ($, ko, Raphael, canvg, GeminiCommunicator) {

    var isFF = window.navigator.userAgent.indexOf('Firefox') != -1;

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
            }
        };
        return HistoryManager;
    })();

    var Shadow = (function () {
        function Shadow(editor) {
            this.Editor = editor;
            this.Rects = [];
        }
        Shadow.prototype.Show = function (x, y, width, height) {
            if(this.Rects.length == 0){
                this.Rects.push(this.Editor.Paper.rect(0, 0, 0, 0));
                this.Rects.push(this.Editor.Paper.rect(0, 0, 0, 0));
                this.Rects.push(this.Editor.Paper.rect(0, 0, 0, 0));
                this.Rects.push(this.Editor.Paper.rect(0, 0, 0, 0));    
                $.each(this.Rects, function(){ this.attr({'stroke-width': 0, 'fill': 'Gray', 'fill-opacity': 0.4}) });   
            }
            this.Rects[0].attr({
                'x': 0,
                'y': 0,
                'width': x + width,
                'height': y
            });
            this.Rects[1].attr({
                'x': x + width,
                'y': 0,
                'width': window.innerWidth - x - width,
                'height': y + height
            });
            this.Rects[2].attr({
                'x': x,
                'y': y + height,
                'width': window.innerWidth - x,
                'height': window.innerHeight - y - height
            });
            this.Rects[3].attr({
                'x': 0,
                'y': y,
                'width': x,
                'height': window.innerHeight - y
            });
        };
        Shadow.prototype.Hide = function () {
            $.each(this.Rects, function(){ this.remove() }); 
            this.Rects = [];
        };
        return Shadow;
    })();

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
                $("#issue_dialog").showLoading();
                this.Communicator.comment(this.ProjectId(), this.IssueId(), this.Comment()).then(function () {
                    return self.Communicator.attach(self.ProjectId(), self.IssueId(), imageData);
                }).done(function () {
                   $("#issue_dialog").hideLoading().dialog("close");
                });
            }
        };
        return DetailsViewModel;
    })();

    var EditorViewModel = (function () {
        function EditorViewModel(options) {
            this.Parent = options.Parent;
            this.ActiveInstrument = ko.observable('Rectangle');
            this.ActiveObject = ko.observable();
            this.ActiveInstrument.subscribe(function (value) {
                this.ActiveObject(null); // for TextMode
            }, this);
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
            this.ViewBox = ko.observable({x: 0, y: 0});
            this.History = new HistoryManager({Editor: this});
            this.Shadow = new Shadow(this);
            this.init();
        }
        EditorViewModel.prototype.init = function () {
            var screenshotUrl = localStorage.getItem('screenshot');
            if (screenshotUrl) {
                var width = window.innerWidth, height = window.innerHeight;
                var fillWindow = function (canvas) {
                    canvas.width  = width;
                    canvas.height = height;
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
                    localStorage.setItem("screenshotStored", localStorage.getItem("screenshot"));
                    localStorage.removeItem("screenshot");
                }
                this.ViewBox({x: 0, y: 0, width: width, height: height});
                this.Paper = new Raphael(document.getElementById('editor'), width, height);
            } else {
                setTimeout(this.init.bind(this), 100);
            }
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
            var initialOffset = this.ViewBox();
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
                    'stroke-width': 1
                });
            }
            if (activeInstrument == 'Text') {
                activeObject.attr('fill', this.ActiveColor());
                this.History.add(activeInstrument, {obj: activeObject});
            } else if (activeInstrument != 'Crop') {
                activeObject.attr('stroke', this.ActiveColor());
                activeObject.attr('stroke-width', 3);
                this.History.add(activeInstrument, {obj: activeObject});
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
                    if(this.ActiveInstrument() == 'Crop'){
                        this.Shadow.Show(minX, minY, maxX - minX, maxY - minY);                        
                    }
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
            var activeInstrument = this.ActiveInstrument();
            if (activeInstrument == 'Crop') {
                var activeObject = this.ActiveObject();
                var x = activeObject.attr('x'), y = activeObject.attr('y');
                var width = activeObject.attr('width'), height = activeObject.attr('height');
                var self = this;
                this.setViewBox(x, y, width, height).done(function () {
                    activeObject.remove();
                    self.History.add('Crop', self.ViewBox());
                    self.ViewBox({x: x, y: y, width: width, height: height});
                    self.ActiveInstrument('Rectangle');
                });
                this.Shadow.Hide();
            }
            this.IsDrawing(false);
            if (!this.IsTextMode()) {
                this.ActiveObject(null);
            }
        };
        EditorViewModel.prototype.setViewBox = function (x, y, width, height) {
            var deferred = $.Deferred();
            this.Paper.setViewBox(x, y, width, height);
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
            imageObj.src = localStorage.getItem('screenshot' + (isFF ? 'Stored' : ''));
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
        EditorViewModel.prototype.undo = function () {
            this.History.revert();
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
