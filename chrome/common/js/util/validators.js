define(['lib/knockout', 'lib/knockout.validation'], function (ko, kov) {
    ko.validation.rules['url'] = {
        validator: function (val) {
            return /^http(s)?\:\/\/[a-z0-9-\\.@:%_\+~#=]+((\.)?[a-z0-9]+)*(:[0-9]{1,5})?(\/.*)*$/.test(val);
        },
        message: 'The field must be a valid URL'
    };
    ko.validation.registerExtenders();
});
