define(['lib/jquery', 'lib/knockout'], function ($, ko) {
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
    return Shadow;
});
