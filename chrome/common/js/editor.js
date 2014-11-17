requirejs.config({
    baseUrl: 'js',
    shim: {
       'lib/jquery.ui.src': {deps: ['lib/jquery.src']},
       'lib/jquery.loading.src': {deps: ['lib/jquery.src']}
   }
});

define(['lib/jquery', 'lib/knockout', 'lib/knockout.validation', 'lib/raphael', 'lib/canvg', 'history',
    'shadow', 'details'],
    function ($, ko, kov, Raphael, canvg, HistoryManager, Shadow, DetailsViewModel) {

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
                    var lineHeight = 19;
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
                self.PaletteVisible(false);
            };
            this.ViewBox = ko.observable({x: 0, y: 0});
            this.FullBox = ko.observable({width: 0, height: 0});
            this.History = new HistoryManager({Editor: this});
            this.Shadow = new Shadow(this);
            this.OldTransform = ko.observable('');
            this.OldInstrument = ko.observable('');
            this.ActiveColorOffset = ko.observable(0);
            this.PaletteVisible = ko.observable(false);
            this.CopyOffset = ko.observable(0);
            this.CopyVisible = ko.observable(false);
            this.CopyImage = ko.observable();
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
            $(document).mousemove(function (e) {
                self.editorMove.call(self, self, e);
            });
            $(document).mouseup(function (e) {
                self.editorUp.call(self, self, e);
            });
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
            this.ActiveColorOffset($('#activeColor').offset().left + $('#activeColor').outerWidth()/2 - $('#palette').outerWidth()/2);
            this.PaletteVisible(true);
        };
        EditorViewModel.prototype.hidePalette = function () {
            this.PaletteVisible(false);
        };
        EditorViewModel.prototype.showCopy = function () {
            this.CopyImage('data:image/png;base64,' + this.getImageData());
            this.CopyOffset($('#copyButton').offset().left + $('#copyButton').outerWidth()/2 - $('#copy').outerWidth()/2);
            this.CopyVisible(true);
        };
        EditorViewModel.prototype.hideCopy = function () {
            this.CopyVisible(false);
        };
        EditorViewModel.prototype.clearEmptyText = function () {
            var activeObject = this.ActiveObject();
            var activeInstrument = this.ActiveInstrument();
            if (activeInstrument == 'Text' && activeObject && !activeObject.attr('text')) {
                activeObject.remove();
                this.History.drop();
            } else if (activeInstrument == 'Text' && activeObject) {
                $(activeObject[0]).css({display: ''});
            }
        };
        EditorViewModel.prototype.getOffset = function (event) {
            var viewBox = this.ViewBox();
            var editorOffset = $('#editor').offset();
            var offset = {
                x: event.pageX - editorOffset.left,
                y: event.pageY - editorOffset.top
            };
            offset.x = Math.min(offset.x, viewBox.width);
            offset.y = Math.min(offset.y, viewBox.height);
            offset.x = Math.max(offset.x, 0);
            offset.y = Math.max(offset.y, 0);
            return {
                x: viewBox.x + offset.x,
                y: viewBox.y + offset.y
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
                    'font-family': 'Arial',
                    display: 'none'});
                this.ActiveObject(activeObject);
                this.ActiveText('');
                $('#texted').show().focus().css({
                    left: event.pageX,
                    top: event.pageY - 14,
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
            var activeObject = this.ActiveObject();
            if (activeInstrument == 'Crop' && activeObject) {
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
            } else if (activeInstrument == 'Move') {
                this.History.add('Move', {obj: this.ActiveObject(), transform: this.OldTransform()});
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
            var editor = document.getElementById('editor');
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
        EditorViewModel.prototype.imgur = function () {
            $("#canvas").showLoading();
            $.ajax({
                url: 'https://api.imgur.com/3/image',
                headers: {
                    'Authorization': 'Client-ID 8c3b028fe76db03'
                },
                type: 'POST',
                data: {
                    'image': this.getImageData()
                }
            }).done(function (response) {
                location.href = response.data.link;
            });
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
