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
        HistoryManager.prototype.drop = function () {
            this.Operations.pop();
        };
        return HistoryManager;
    })();

    var Shadow = (function () {
        function Shadow(editor) {
            this.Editor = editor;
            this.Visible = ko.observable(false);
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
            var fullBox = this.Editor.FullBox();
            var fullWidth = fullBox.width;
            var fullHeight = fullBox.height;
            this.Rects[0].attr({
                'x': 0,
                'y': 0,
                'width': x + width,
                'height': y
            });
            this.Rects[1].attr({
                'x': x + width,
                'y': 0,
                'width': fullWidth - x - width,
                'height': y + height
            });
            this.Rects[2].attr({
                'x': x,
                'y': y + height,
                'width': fullWidth - x,
                'height': fullHeight - y - height
            });
            this.Rects[3].attr({
                'x': 0,
                'y': y,
                'width': x,
                'height': fullHeight - y
            });
            this.Visible(true);
        };
        Shadow.prototype.Hide = function () {
            $.each(this.Rects, function(){ this.remove() }); 
            this.Rects = [];
            this.Visible(false);
        };
        return Shadow;
    })();

    var DetailsViewModel = (function () {
        function DetailsViewModel(options) {
            this.Parent = options.Parent;
            this.Comment = ko.observable();
            this.Title = ko.observable();
            this.Description = ko.observable();
            this.Issue = ko.observable();
            this.IssueId = ko.computed(function () {
                var issue = this.Issue();
                if (issue != null) {
                    return issue.Id;
                }
                return null;
            }, this);
            this.Project = ko.observable();
            this.Projects = ko.observableArray();
            this.ProjectId = ko.computed(function () {
                var project = this.Project();
                return project ? project.Id : null;
            }, this);
            this.TemplateId = ko.computed(function () {
                var project = this.Project();
                return project? project.TemplateId : null;
            }, this);
            this.ProjectId.subscribe(function (projectId) {
                this.loadComponents(projectId);
            }, this);
            this.TemplateId.subscribe(function (templateId) {
                var self = this;
                this.loadMetaData('type', templateId).done(function (data) {
                    self.Types(data);
                });
                this.loadMetaData('priority', templateId).done(function (data) {
                    self.Priorities(data);
                });
                this.loadMetaData('severity', templateId).done(function (data) {
                    self.Severities(data);
                });
                this.loadMetaData('status', templateId).done(function (data) {
                    self.Statuses(data);
                });
            }, this);

            this.Component = ko.observable();
            this.Components = ko.observableArray();
            this.Priority = ko.observable();
            this.Priorities = ko.observableArray();
            this.Severity = ko.observable();
            this.Severities = ko.observableArray();
            this.Type = ko.observable();
            this.Types = ko.observableArray();
            this.Status = ko.observable();
            this.Statuses = ko.observableArray();
            this.Communicator = new GeminiCommunicator();
            this.ActiveTab = ko.observable('Create');
            this.init();
        }
        DetailsViewModel.prototype.init = function () {
            var self = this;
            $("#issue").autocomplete({
                appendTo: "#issue_dialog",
                minLength: 3,
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
                            });
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
                    self.Project(ui.item.Project);
                    return false;
                }
            });
            $("#issue_dialog").dialog(
                {
                    draggable: false,
                    autoOpen: false,
                    width: 500
                }
            ).parent().draggable();
        };
        DetailsViewModel.prototype.selectCreate = function () {
            this.ActiveTab('Create');
        };
        DetailsViewModel.prototype.selectAttach = function () {
            this.ActiveTab('Attach');
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
                   window.close();
                });
            }
        };
        DetailsViewModel.prototype.createIssue = function () {
            var imageData = this.Parent.Editor.getImageData();            
            var self = this;
            $("#issue_dialog").showLoading();
            var component = this.Component();
            this.Communicator.create(
                this.Title(),
                this.Description(),
                this.ProjectId(),
                component ? component.Id : '',
                this.Type().Id,
                this.Priority().Id,
                this.Severity().Id,
                this.Status().Id
            ).then(function (data) {
                return self.Communicator.attach(data.Project.Id, data.Id, imageData);
            }).done(function () {
                $("#issue_dialog").hideLoading().dialog("close");
                window.close();
            });
        };
        DetailsViewModel.prototype.showDialog = function () {
            $("#issue_dialog").dialog("open");
            var self = this;
            this.Communicator.loadProjects().then(function(data) {
                var projects = ko.utils.arrayMap(data, function (item) {
                    return item.BaseEntity;
                });
                self.Projects(projects);
            });
        };
        DetailsViewModel.prototype.loadComponents = function (projectId) {
            var self = this;
            this.Communicator.loadComponents(projectId).then(function(data) {
                var result = ko.utils.arrayMap(data, function (item) {
                    return item.BaseEntity;
                });
                if(result.length == 0) {
                    result.push({});
                }
                self.Components(result);
            });
        };
        DetailsViewModel.prototype.loadMetaData = function (controlId, templateId) {
            return this.Communicator.loadMetaData(controlId, templateId).then(function (data) {
                return ko.utils.arrayMap(data, function (item) {
                    return item.Entity;
                })
            });
        };
        DetailsViewModel.prototype.closeDialog = function () {
            $("#issue_dialog").dialog("close");
        };
        return DetailsViewModel;
    })();

    var EditorViewModel = (function () {
        function EditorViewModel(options) {
            this.Parent = options.Parent;
            this.IsDrawing = ko.observable(false);
            this.ActiveInstrument = ko.observable('Crop');
            this.ActiveObject = ko.observable();
            this.ActiveInstrument.subscribe(function (value) {
                if (this.Shadow.Visible()) { // abort Crop
                    this.ActiveObject().remove();
                    this.Shadow.Hide();
                }
                if (value != 'Move') {
                    this.ActiveObject(null); // for TextMode
                    this.IsDrawing(false);
                }
                $('#texted').hide();
            }, this);

            this.ActiveInstrument.subscribe(function (oldValue) {
                this.clearEmptyText();
            }, this, "beforeChange");
            this.ActiveColor = ko.observable('Red');
            this.StartPoint = ko.observable();
            this.ActiveText = ko.observable();
            this.ActiveText.subscribe(function (value) {
                var activeText = this.ActiveObject();
                activeText.attr('text', value);
                for (var i = 0; i < activeText[0].childNodes.length; i++) {
                    var node = activeText[0].childNodes[i];
                    var lineHeight = 19 + (isFF ? 1 : 0);
                    var emptyPrevsCount = 0;
                    $(node).prevAll().each(function(index) {
                        if($(this).text()) {
                            return false;
                        } else {
                            emptyPrevsCount++;
                        }
                    });
                    node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space","preserve");
                    node.setAttribute('dy', lineHeight * (emptyPrevsCount + 1));
                }
                activeText[0].firstChild.setAttribute('dy', '0');
                var activeTextBox = activeText.getBBox();
                var textEditor = $('#texted');
                var textEditorOffset = textEditor.offset();
                var textEditorWidth = activeTextBox.width + 12;
                var textEditorHeight = activeTextBox.height + 12;
                var editor = $('#editor');
                var editorOffset = editor.offset();
                var widthIsExcessive = textEditorOffset.left + textEditorWidth > editorOffset.left + editor.width();
                var heightIsExcessive = textEditorOffset.top + textEditorHeight > editorOffset.top + editor.height();
                if (widthIsExcessive || heightIsExcessive) {
                    this.ActiveText(value.substring(0, value.length - 1));
                }
                textEditor.css('width', textEditorWidth).attr('rows', activeText[0].childNodes.length);
            }, this);
            this.Colors = ko.observableArray(['Red', 'Orange', 'Green', 'Blue']);
            var self = this;
            this.setColor = function (color) {
                self.ActiveColor(color);
                self.hidePalette();
            };
            this.ViewBox = ko.observable({x: 0, y: 0});
            this.FullBox = ko.observable({width: 0, height: 0});
            this.ActiveColorOffset = ko.observable(0);
            this.History = new HistoryManager({Editor: this});
            this.Shadow = new Shadow(this);
            this.OldTransform = ko.observable('');
            this.OldInstrument = ko.observable('');
            this.Palette = ko.observable('hide');
            this.init();
        }
        EditorViewModel.prototype.init = function () {
            var self = this;
            var width = window.innerWidth, height = window.innerHeight;
            var imageObj = new Image();
            imageObj.onload = function() {
                width = this.naturalWidth;
                height = this.naturalHeight;
                self.Paper = new Raphael(document.getElementById('editor'), width, height);
                self.setViewBox(0, 0, width, height);
                self.FullBox({width: width, height: height});
            };
            imageObj.src = localStorage.getItem('screenshot');
            $(window).resize(this.setCenter.bind(this));
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
        EditorViewModel.prototype.showPalette = function () {
            this.ActiveColorOffset($('#activeColor').offset().left + $('#activeColor').outerWidth()/2 - $('#palette-cont').outerWidth()/2);
            this.Palette('show');
        };
        EditorViewModel.prototype.hidePalette = function () {            
            this.Palette('hide');
        };
        EditorViewModel.prototype.clearEmptyText = function () {
            var activeObject = this.ActiveObject();
            var activeInstrument = this.ActiveInstrument();
            if (activeInstrument == 'Text' && activeObject && !activeObject.attr('text')) {
                activeObject.remove();
                this.History.drop();
            }
        };
        EditorViewModel.prototype.getOffset = function (event) {
            var viewBox = this.ViewBox();
            var offset = $('#editor').offset();
            return {
                x: viewBox.x + event.pageX - offset.left,
                y: viewBox.y + event.pageY - offset.top
            };
        };
        EditorViewModel.prototype.editorDown = function (data, event) {
            var activeObject = null;
            var target = event.target;
            this.clearEmptyText();
            if (target != null) {
                if (target.nodeName == 'tspan') target = target.parentNode;
                if (target.raphael) {
                    activeObject = this.Paper.getById(target.raphaelid);
                    this.OldTransform(activeObject.transform());
                    this.OldInstrument(this.ActiveInstrument());
                    this.ActiveInstrument('Move');
                }
            } else {
                if (this.IsDrawing()) return;
            }
            this.IsDrawing(true);
            var offset = this.getOffset(event);
            this.StartPoint({x: offset.x, y: offset.y});
            var activeInstrument = this.ActiveInstrument();
            if (activeInstrument == 'Rectangle') {
                activeObject = this.Paper.rect(offset.x, offset.y, 0, 0);
            } else if (activeInstrument == 'Arrow') {
                activeObject = this.Paper.path('M0,0');
            } else if (activeInstrument == 'Text') {
                activeObject = this.Paper.text(offset.x, offset.y, '');
                activeObject.attr('fill', this.ActiveColor());
                activeObject.attr('text-anchor', 'start');
                $(activeObject[0]).css({
                    'font-size': '16px',
                    'font-family': 'Arial'});
                this.ActiveObject(activeObject);
                this.ActiveText('');
                $('#texted').show().focus().css({
                    left: event.pageX - (isFF ? 1 : 0),
                    top: event.pageY - 15 - (isFF ? 1 : 0),
                    'font-size': '16px',
                    'font-family': 'Arial',
                    color: this.ActiveColor()
                });
            } else if (activeInstrument == 'Crop') {
                activeObject = this.Paper.rect(offset.x, offset.y, 0, 0);
                activeObject.attr({
                    'stroke' : '#777',
                    'stroke-dasharray' : '--.',
                    'stroke-width': 1
                });
            }
            if (activeInstrument == 'Rectangle' || activeInstrument == 'Arrow') {
                activeObject.attr('stroke', this.ActiveColor());
                activeObject.attr('stroke-width', 3);
            }
            if (activeObject && activeInstrument != 'Move' && activeInstrument != 'Crop') {
                this.History.add(activeInstrument, {obj: activeObject});
            }
            this.ActiveObject(activeObject);
        };
        EditorViewModel.prototype.editorMove = function (data, event) {
            var activeObject = this.ActiveObject();
            var activeInstrument = this.ActiveInstrument();
            var offset = this.getOffset(event);
            if (this.IsDrawing() && activeObject && activeInstrument != 'Text' && !event.which) {
                this.editorUp(data, event);
            }
            if (this.IsDrawing() && activeObject && event.which) {
                var startPoint = this.StartPoint();
                var activeInstrument = this.ActiveInstrument();
                if (activeInstrument == 'Rectangle' || activeInstrument == 'Crop') {
                    var minX = Math.min(startPoint.x, offset.x);
                    var maxX = Math.max(startPoint.x, offset.x);
                    var minY = Math.min(startPoint.y, offset.y);
                    var maxY = Math.max(startPoint.y, offset.y);
                    activeObject.attr('x', minX);
                    activeObject.attr('y', minY);
                    activeObject.attr('width', maxX - minX);
                    activeObject.attr('height', maxY - minY);
                    if(activeInstrument == 'Crop'){
                        this.Shadow.Show(minX, minY, maxX - minX, maxY - minY);                        
                    }
                } else if (activeInstrument == 'Arrow') {
                    var arrowPath = function(x1, y1, x2, y2, size) {
                        var angle = Raphael.angle(x1, y1, x2, y2);
                        var a45   = Raphael.rad(angle-25);
                        var a45m  = Raphael.rad(angle+25);
                        var x2a = x2 + Math.cos(a45) * size;
                        var y2a = y2 + Math.sin(a45) * size;
                        var x2b = x2 + Math.cos(a45m) * size;
                        var y2b = y2 + Math.sin(a45m) * size;
                        return "M"+x1+","+y1+"L"+x2+","+y2+
                            "M"+x2a+","+y2a+"L"+x2+","+y2+
                            "L"+x2b+","+y2b;
                    };
                    activeObject.attr('path', arrowPath(startPoint.x, startPoint.y, offset.x, offset.y, 15));
                } else if (activeInstrument == 'Move') {
                    activeObject.transform(this.OldTransform() + 't' + (offset.x - startPoint.x) + ',' + (offset.y - startPoint.y));
                }
            }
        };
        EditorViewModel.prototype.editorUp = function (data, event) {
            var activeInstrument = this.ActiveInstrument();
            if (activeInstrument == 'Crop') {
                var activeObject = this.ActiveObject();
                var x = activeObject.attr('x'), y = activeObject.attr('y');
                var width = activeObject.attr('width'), height = activeObject.attr('height');
                if (width * width + height * height > 50) {
                    this.History.add('Crop', this.ViewBox());
                    var self = this;
                    this.setViewBox(x, y, width, height).done(function () {
                        activeObject.remove();
                    });
                } else {
                    activeObject.remove();
                }
                this.Shadow.Hide();
            }
            this.IsDrawing(false);
            if (activeInstrument != 'Text') {
                this.ActiveObject(null);
            }
            if (activeInstrument == 'Move') {
                this.ActiveInstrument(this.OldInstrument());
            }
        };
        EditorViewModel.prototype.setViewBox = function (x, y, width, height) {
            var deferred = $.Deferred();
            this.Paper.setViewBox(x, y, width, height);
            this.Paper.setSize(width, height);
            var sourceCanvas = document.getElementById('canvas');
            var outputCanvas = document.getElementById('output');
            sourceCanvas.width = width; sourceCanvas.height = height;
            outputCanvas.width = width; outputCanvas.height = height;
            var imageObj = new Image();
            var self = this;
            imageObj.onload = function() {
                sourceCanvas.getContext('2d').drawImage(this, x, y, width, height, 0, 0, width, height);
                outputCanvas.getContext('2d').drawImage(this, x, y, width, height, 0, 0, width, height);
                self.ViewBox({x: x, y: y, width: width, height: height});
                self.setCenter();
                deferred.resolve();
            };
            imageObj.src = localStorage.getItem('screenshot');
            return deferred.promise();
        };
        EditorViewModel.prototype.setCenter = function () {
            var viewBox = this.ViewBox();
            var left = Math.round((window.innerWidth - viewBox.width) / 2);
            var top = Math.round((window.innerHeight - viewBox.height) / 2);
            if (top < 0) top = 0;
            if (left < 0) left = 0;
            if (top > 30) top = 30;
            var sourceCanvas = document.getElementById('canvas');
            var outputCanvas = document.getElementById('output');
            outputCanvas.style.left = left + 'px'; outputCanvas.style.top = top + 'px';
            sourceCanvas.style.left = left + 'px'; sourceCanvas.style.top = top + 'px';
            var editor = document.getElementById("editor");
            editor.style.left = left + 'px'; editor.style.top = top + 'px';
        };
        EditorViewModel.prototype.getImageData = function () {
            var output = document.getElementById('output');
            canvg(output, document.getElementById('editor').innerHTML, {ignoreDimensions: true, ignoreClear: true});
            var img = output.toDataURL('image/png');
            img = img.replace('data:image/png;base64,', '');
            return img;
        };
        EditorViewModel.prototype.send = function () {
            this.Parent.Details.showDialog();
        };
        EditorViewModel.prototype.download = function () {
            $('#download').attr('href', 'data:image/png;base64,' + this.getImageData())[0].click();
        };
        EditorViewModel.prototype.showOptionsPage = function () {
            window.open('options.html');
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
