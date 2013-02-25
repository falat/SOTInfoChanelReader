
/// <reference path="jquery/jquery.mobile-1.2.0.js" />
/// <reference path="jquery/jquery-1.8.3.js" />

var languages = ["pl-PL", "en-US", "de-De", "ru-RU"];
var curentLangueageIndex = 0;
var currentFeedType = "RSS";
var silesiaTravelUrl = "http://sot.global-it.pl";
var channelList = [];

var entries = [];
var selectedEntry = "";
var channelPostList = [];
var selectedChannel;
var selectedPostIndex;

var tilesList =[];

var tilesListIsUpdated = false;
var channelsListIsUpdated = false;
var postListForChannelIsUpdated = [];

var updateTimer;
var isGroupSelected = false;
var selectedGroup;

var instaledCultures = [new Culture("pl-PL", "Polski"),
                        new Culture("en-US", "English")
];

/// cultures and translation functions 

function Culture(cultureName, language) {
    this.Name = cultureName;
    this.Language = language;
}

function Place(id, name) {
    this.Id = id;
    this.Name = name;
}
var tmpPlace = new Place(-1, "");

function AppSettings() {
    this.instaledCultures =
        [
            new Culture("pl-PL", "Polski"),
            new Culture("en-US", "English")
        ];
    this.CurentCulture = "pl-PL";

    this.UserName = "User01";
    this.RelativeUrl = "Kanaly-uzytkownika";
    this.GroupsRelatiVeUrl = "Kanaly-informacyjne/Grupy";
    this.SiteUrl = "http://silesia.travel";

    this.SelectedTown = "Katowice";
    this.Place = new Place(-1, "");
    this.UpdateInterval = 1;// czas uaktualnia danych w minutach

    this.OverrideLocation = false;

    // this.channelServerUrl = "http://silesia.travel"
    this.ChanelListSourceUrl = function () {
        //   return "TestChannelList.xml";

        return this.SiteUrl + "/" + this.CurentCulture + "/" + this.RelativeUrl + "/" + this.UserName;
    }
    this.GetCurrentCulture = function () {
        return this.CurentCulture;
    }
    this.SetCurrentCulture = function (newCulture) {
        this.CurentCulture = newCulture;

        TranslateInterface();
    }

    this.SetAppSettings = function (newAppSettings) {
    }

    this.OperatingSystem = "blackberry";

    this.GetTilesSourceUrl = function () {
        // Kanaly-informacyjne/Grupy - pobrania listy grup
        // Kanaly-informacyjne/Grupa/{id} - link do grupy kanałow
        return this.SiteUrl + "/" + this.CurentCulture + "/" + this.GroupsRelatiVeUrl;
    }
}
function detectDeviceOperatingSystem() {
    try {
        var platform = device.platform;
       
        if (platform.indexOf("BlackBerry") != -1) return "blackberry";
    }
    catch (ex) { }

    return "android";
}
var appSettings = new AppSettings();
function LoadAppSettings() {

    if (window.localStorage.getItem("appSettings")) {
        var apps = JSON.parse(window.localStorage.getItem("appSettings"));

        appSettings.UserName = apps.UserName;
        appSettings.SiteUrl = apps.SiteUrl;
        appSettings.SelectedTown = apps.SelectedTown;
        appSettings.CurentCulture = apps.CurentCulture;
        appSettings.Place = apps.Place;
        appSettings.OverrideLocation = apps.OverrideLocation;
        appSettings.UpdateInterval = apps.UpdateInterval;
        appSettings.OverrideLocation = apps.OverrideLocation;
    }
    TranslateInterface();
      

    window.clearInterval(updateTimer);
    updateTimer = setInterval(TimerFunction(), appSettings.UpdateInterval * 1000 * 60);
}

function TimerFunction() {
    channelsLisIsUpdated = false;
    tilesListIsUpdated = false;
    postListForChannelIsUpdated.length = 0;
}
function T(toTranslation) {

    var currCulture = appSettings.GetCurrentCulture();
    var translatorArray;
    switch (currCulture) {
        case "pl-PL": break;

        case "en-US":
            translatorArray = translationPL_En;
            break;
    }

    if (typeof (translatorArray) != 'undefined' && translatorArray[toTranslation]) {
        return translatorArray[toTranslation];
    }

    return toTranslation;
}

String.prototype.insert = function (index, string) {
    if (index > 0)
        return this.substring(0, index) + string + this.substring(index, this.length);
    else
        return string + this;
};

/////////////////////////////////////////////////////
function GSFeedPost(id, title, decription, link, guid, channelId, summary) {
    this.Id = id;
    this.ChannelId = channelId;
    this.Title = title;
    this.Descritpion = description;
    this.Link = link;
    this.Guid = guid;
    this.Summary = summary;
}

function GSFeedChannel(id, title, summary, type, baseLangIndex, link) {

    this.Id = id;
    this.Title = title;
    this.Summary = summary;
    this.Posts = [];
    this.link = link;

    this.CurrentLang = function () {
        return (typeof baseLangIndex != 'undefined') ? languages[baseLangIndex] : languages[0];
    }
    this.Type = type;

    this.Url = function () {

        var index = 0;// appSettings.SiteUrl.length -1;

        var result = this.link.insert(index, "/" + appSettings.GetCurrentCulture());
        if (appSettings.OverrideLocation)
            result += "&place=" + appSettings.Place.Id;

        return appSettings.SiteUrl + result;

        //  return this.link + "&cultureId="+ appSettings.GetCurrentCulture();//silesiaTravelUrl + '/' + this.CurrentLang() + '/' + this.Type() + '/' + this.Id;
    }
}

function getChannelTypeFromLink(link) {
    var index = link.lastIndexOf('type=');
    var result = link.substring(index + 5, link.length);

    return result;
}
function GSTestchannel(name, description, url) {
    this.Id = -1;
    this.Title = name;
    this.Summary = description;
    this.Url = function () { return url; }
}

function GetImageSrcForChannelType(channelType) {
    switch (channelType) {

        case "MicroBlog": return '<img src="images/bluesot/mikroblog.png" />'; break;
        case "InfoService": return '<img src="images/bluesot/news.png" />'; break;
        case "FindPoiService": return '<img src="images/bluesot/poi.png" />'; break;
        case "WeatherService": return '<img src="images/bluesot/pogoda.png" />'; break;
        case "Newsletter": return '<img src="images/bluesot/newsletter.png" />'; break;
        case "PublicTransportService": return '<img src="images/bluesot/transport.png" />'; break;
    }

    return '<img src="images/bluesot/news.png " />';
}

function RenderChannelList(items, channelListDisplay) {

    var contentHTML = ""
    $.each(items,
                   function (i, entry) {
                       contentHTML += '<li data-icon="sot-arrow">'// '<li  onclick="ShowChannel(' + i + ')" >';

                       contentHTML += '<a href="#ChannelPostListPage" class="contentLinkForChannel"   data-entryid="' + i + '" rel="external"><div class="list-item">';
                       contentHTML += GetImageSrcForChannelType(entry.Type);
                       contentHTML += '<div class="list-item-content">';
                       contentHTML += '<div class="title">' + entry.Title + '</div>';//"<h2>" + entry.Name + "</h2>";
                       contentHTML += '<div class="summary">' + entry.Summary + "</div>";
                       contentHTML += '</div>';
                       contentHTML += "</div></a></li>\n"

                   });

    $(channelListDisplay).html(contentHTML);
    //$(channelListDisplay + ' :visible').listview("refresh");
    $(channelListDisplay).listview("refresh");
    console.log(T("Lista kanałów została załadowana"));

}
function GetChannelsList(userName, channelListDisplay) {

    var url = appSettings.ChanelListSourceUrl();// "TestChannelList.xml";
    
    $.ajax({
        url: url,
        success: function (resultData, textStatus, jqXHR) {
            entries = [];
            channelList = [];
            var xml = $(resultData);
            var items = xml.find("entry");
            var contentHTML = "";
            $.each(items,
                function (i, v) {
                    entry = new GSFeedChannel(
                        $(v).find("id").text(),
                        $(v).find("title").text(),
                        $(v).find("summary").text(),
                        $(v).find("category").attr('term'),
                        curentLangueageIndex,
                        $(v).find("link").attr("href")
                        );

                    entries.push(entry);
                });

            //    entries.push(new GSTestchannel("Halny test rss 1", "testowy rss z KŻ Halny", "http://www.halny.org.pl/index.php?format=feed&type=rss"));

            channelList = entries;

            window.localStorage.setItem("channelList", JSON.stringify(channelList));
            RenderChannelList(channelList, channelListDisplay);
        },
        error: function (jqXHR, status, error) {
            //try to use cache
            if (window.localStorage.getItem("channelList")) {
                // $("#status").html("Using cached version...");   
                
                entries = JSON.parse(window.localStorage.getItem("channelList"));
                channelList = [];
                $.each(entries,
              function (i, v) {
                  entry = new GSFeedChannel(
                      v.Id,
                      v.Title,
                      v.Summary,
                      currentFeedType,
                      curentLangueageIndex,
                      v.link
                      );

                  channelList.push(entry);
              });

                RenderChannelList(channelList, channelListDisplay);

            } else {
                $("#errorComunicate").html(T("Przepraszamy, ale nie udało się załadować informacji o dostępnych kanałach"));
                $.mobile.changePage($('#ErrorPage'));
            }
        }
    })
}

function GetChannelListForGroup(group, channelListDisplay) {
    var gropupUrl = group.link;
    
    $.ajax({
        url: gropupUrl,
        success: function (resultData, textStatus, jqXHR) {
            entries = [];
            channelList = [];
            var xml = $(resultData);
            var items = xml.find("entry");
            var contentHTML = "";
            $.each(items,
                function (i, v) {
                    entry = new GSFeedChannel(
                        $(v).find("id").text(),
                        $(v).find("title").text(),
                        $(v).find("summary").text(),
                        $(v).find("category").attr('term'),
                        curentLangueageIndex,
                        $(v).find("link").attr("href")
                        );

                    entries.push(entry);
                });

            //    entries.push(new GSTestchannel("Halny test rss 1", "testowy rss z KŻ Halny", "http://www.halny.org.pl/index.php?format=feed&type=rss"));

            channelList = entries;

            window.localStorage.setItem("channelList", JSON.stringify(channelList));
            if (typeof channelListDisplay != 'undefined')
                RenderChannelList(channelList, channelListDisplay);
        },
        error: function (jqXHR, status, error) {
            //try to use cache
         /*   if (window.localStorage.getItem("channelList")) {
                // $("#status").html("Using cached version...");   

                entries = JSON.parse(window.localStorage.getItem("channelList"));

                channelList = [];

                $.each(entries,
              function (i, v) {
                  entry = new GSFeedChannel(
                      v.Id,
                      v.Title,
                      v.Summary,
                      currentFeedType,
                      curentLangueageIndex,
                      v.link
                      );

                  channelList.push(entry);
              });
                if (typeof channelListDisplay != 'undefined')
                    RenderChannelList(channelList, channelListDisplay);

            } else {
                $("#errorComunicate").html(T("Przepraszamy, ale nie udało się załadować informacji o dostępnych kanałach"));
                $.mobile.changePage($('#ErrorPage'));
            }
            */
        }
    })
}

function RenderChannelContent(items, channelPostsListElement) {

    $('#channelTitleforPostList').html(selectedChannel.Title);
    var img = $(GetImageSrcForChannelType(selectedChannel.Type));
    // img.addClass('ui-li-icon');
    var s = '';
    $.each(items, function (i, v) {
        s += '<li data-icon="sot-arrow"><a href="#ChannelPostContentPage" class="contentLinkForPost"  data-entryid="' + i + '">';
        s += '<div class="post-item">';
        s += img.get(0).outerHTML;//$('< div>').append(img.clone()).remove().html();;
        s += '<div class="post-item-content">';
        s += '<div class="datetime">' + new Date(v.updated).format('dd.mm.yyyy HH:MM') + '</div>';
        s += '<div class="title">' + v.title + '</div>';
        s += '<div class="summary">' + v.summary.substr(0, 250) + '...' + '</div>';
        s += '</div>';
        s += '</div>';
        s += '</a></li>';
    });

    $(channelPostsListElement).html(s);
    $(channelPostsListElement).listview("refresh");
}
function GetChannelContent(channel, channelPostsListElement) {
    if (typeof channel != 'undefined') {
        var rssUrl = channel.Url();
        
        $.ajax({
            url: rssUrl,
            success: function (res, code) {
                entries = [];
                channelPostList = [];
                var xml = $(res);
                var items = xml.find("entry");
                $.each(items, function (i, v) {
                    entry = {
                        title: $(v).find("title").text(),
                        link: $(v).find("link").text(),
                        guid: $(v).find("guid").text(),
                        description: $.trim($(v).find("description").text()),
                        summary: $(v).find("summary").text(),
                        content: $(v).find("content").text(),
                        updated: $(v).find("updated").text()
                    };
                    entries.push(entry);
                });

                channelPostList = entries;

                window.localStorage.setItem("channelPostList" + channel.Id, JSON.stringify(channelPostList));

                if (typeof channelPostsListElement != 'undefined')
                    RenderChannelContent(channelPostList, channelPostsListElement);
            },
            error: function (jqXHR, status, error) {
                //try to use cache
                if (window.localStorage.getItem("channelPostList" + channel.Id)) {
                    // $("#status").html("Using cached version...");   
                    channelPostList = JSON.parse(window.localStorage.getItem("channelPostList" + channel.Id));
                    RenderChannelContent(channelPostList, channelPostsListElement);

                } else {
                    $("#errorComunicate").html(T("Przepraszamy, ale nie udało się załadować listy postów dla wybranego kanału"));
                    $.mobile.changePage($('#ErrorPage'));
                }
            }
        });

    } else
        console.error(T("Nie zdefiniowany kanał rss"));
}

function GetPostContent(selectedPostIndex) {

    $('#channelTitleforPost').html(selectedChannel.Title);

    var selectedPost = channelPostList[selectedPostIndex];

    var contentHTML = "<h1>" + selectedPost.title + "</h1>";

    contentHTML += '<article>' + selectedPost.content + '</article>';
    // contentHTML += '<a href="' + selectedPost.link + '">' + T("Wyświetl w przeglądarce") + '</a>';

    $("#postContent").html(contentHTML);

}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDirection() {

    //if (getRandomInt(0, 1) > 0) return "vertical";

    return "vertical";
}

function getRandomColor() {
    //var colors = ["amber", "blue", "brown", "cobalt", "crimson", "cyan", "emerald", "green", "indigo", "lime", "magenta", "mango",
    //              "mauve", "olive", "orange", "pink", "purple", "violet", "red", "sienna", "steel", "teal", "yellow"];

    var colors = ["teal", "red", "violet", "pink", "orange", "olive", "green", "cyan", "blue"];

    var rIndex = getRandomInt(0, colors.length - 1);

    return colors[rIndex];
}

function getRandomTileMode() {
    if (getRandomInt(0, 1) > 0) return "slide";

    return "flip";
}
function selectTileClick(tileIndex) {
    isGroupSelected = true;
    selectedGroup = tilesList[tileIndex];
    //  selectedChannel = tilesList[tileIndex];
}
function selectUserChannelsListClick() {
    isGrooupSelected = false;
}

function AddTile(tileElement, parameters) {
    var newLink = $('<a />', {

        href: '#ChannelsListPage',// parameters.link,
    });

    var newTile = $('<div />')
    newTile.addClass("live-tile");
    newTile.addClass(parameters.color);
    newTile.attr("onclick", "selectTileClick(" + parameters.index + ")");
    var delayValue = getRandomInt(5, 10) * 1000;

    var data = parameters.data;

    // default data
    if (typeof data == 'undefined') {
        data = [{ name: "stops", value: "100%" },
                { name: "speed", value: "750" },
                { name: "delay", value: delayValue },
                { name: "mode", value: "slide" },
                { name: "direction", value: getRandomDirection() }];
    }

    $.each(data,
                  function (i, d) {
                      newTile.attr("data-" + d.name, d.value);
                  });
    var front;
    var back;
    if (parameters.frontText)
        front = $('<div>' + parameters.frontText + '</div>')
    if (parameters.backText)
        back = $('<div>' + parameters.backText + '</div>')

    if (parameters.frontImageUrl)
        $('<img src="' + parameters.frontImageUrl + '" />').appendTo(front);

    if (parameters.backImageUrl)
        $('<img src="' + parameters.backImageUrl + '" />').appendTo(back);

    if (front)

        front.appendTo(newTile);
    if (back)
        back.appendTo(newTile);
    $(newTile).liveTile();//.liveTile({ $back: back, $front: front });

    newTile.appendTo(newLink);
    newLink.appendTo(tileElement);
}
function AddCarouselTile(tileElement, parameters, tileEntries) {
    var tileGroup = $('<div class="channelGroupTile" data-entryid="'+ parameters.index+'"/>');
    // tileGroup.addClass('tile-group');
    tileGroup.addClass(parameters.color);

    var newLink = $('<a />', {

        href: '#ChannelsListPage',// parameters.link,
        
    });

    var data = [

           { name: "delay", value: getRandomInt(3000, 5000) },
           { name: "mode", value: "carousel" },
           { name: "direction", value: getRandomDirection() },
           { name: "start-now", value: "true" }
    ];

    var newTile = $('<div />');
    newTile.addClass("live-tile");
    $.each(data,
                  function (i, d) {
                      newTile.attr("data-" + d.name, d.value);
                  });

    for (var e in tileEntries) {
        var carouselContent = $('<div class="metroExtraSmall" />');

        carouselContent.addClass(tileEntries[e].Type);
        //     var imageSrc = $( GetImageSrcForChannelType( getChannelTypeFromLink(tileEntries[e].link)));


        //  imageSrc.addClass("tileImage");
        //  imageSrc.appendTo(carouselContent);
        $('<p>' + tileEntries[e].Title + '</p>').appendTo(carouselContent)

        carouselContent.appendTo(newTile);
    }

    $(newTile).liveTile();

    newTile.appendTo(newLink);
    newLink.appendTo(tileGroup);
    tileGroup.appendTo(tileElement);

}

function RenderTilesList(tilesList, tilesListDisplay) {
    var parameters = {}
    $(tilesListDisplay).html("");
    $.ajaxSetup(
        { async: false });

    $.each(tilesList, function (i, group) {
        parameters.index = i;
        parameters.link = group.link;
        parameters.frontText = '<span>' + group.Title + '</span><span class="tile-title"><ul>';

        GetChannelListForGroup(group)
        entries = JSON.parse(window.localStorage.getItem("channelList"));

        for (var e in entries) {
            parameters.frontText += '<li>' + entries[e].Title + '</li>'
        }

        parameters.frontText += '</span></ul>'
        // parameters.backText = channel.Summary.substring(0, 100) + "...";
        // parameters.frontImageUrl = "images/sot_logo.jpg";
        // parameters.backImageUrl = "images/sot_logo.jpg";
        parameters.color = getRandomColor();

        parameters.data = [{ name: "stops", value: "100%" },
               // { name: "speed", value: getRandomInt(5, 10) * 100 },
              //  { name: "delay", value: getRandomInt(5, 10) * 1000 },
                { name: "mode", value: "nomove" }, // getRandomTileMode() },
              //  { name: "direction", value: getRandomDirection() }
        ];
        //AddTile(tilesListDisplay, parameters);
        AddCarouselTile(tilesListDisplay, parameters, entries)
    });

    $(".channelGroupTile").live("click", function () {
        selectedEntry = $(this).data("entryid");
        isGroupSelected = true;
        selectedGroup = tilesList[selectedEntry];
        
    });

    $.ajaxSetup(
        { async: true });
}
function GetTilesList(tilesListDisplay) {
    var url = appSettings.GetTilesSourceUrl();// "TestChannelList.xml";
  
    if (!tilesListIsUpdated) {

        $.ajax({
            url: url,
            timeout: 5000,
            success: function (resultData, textStatus, jqXHR) {
                entries = [];
                tilesList = [];
                var xml = $(resultData);
                var items = xml.find("entry");
                var contentHTML = "";
                $.each(items,
                    function (i, v) {
                        entry = new GSFeedChannel(
                            $(v).find("id").text(),
                            $(v).find("title").text(),
                            $(v).find("summary").text(),
                            $(v).find("category").attr('term'),
                            curentLangueageIndex,
                            $(v).find("link").attr("href")
                            );

                        entries.push(entry);
                    });

                tilesList = entries;

                window.localStorage.setItem("tilesList", JSON.stringify(tilesList));
                RenderTilesList(tilesList, tilesListDisplay);
                tilesListIsUpdated = true;

            },
            error: function (jqXHR, status, error) {
                if (jqXHR.status != 0)
                //try to use cache
                if (window.localStorage.getItem("tilesList")) {
                    // $("#status").html("Using cached version...");   
                    tilesList = [];
                    entries = JSON.parse(window.localStorage.getItem("tilesList"));

                   
                    $.each(entries,
                  function (i, v) {
                      entry = new GSFeedChannel(
                          v.Id,
                          v.Title,
                          v.Summary,
                          currentFeedType,
                          curentLangueageIndex,
                          v.link
                          );

                      tilesList.push(entry);
                  });

                    RenderTilesList(tilesList, tilesListDisplay);

                } else {
                    // nie pokazywać erro page bo ma się wyświetlić strona glowna
                    console.log(T("Przepraszamy, ale nie udało się załadować informacji o dostępnych kanałach na stronie głównej"));

                }
            }
        })

    } else {
        window.localStorage.setItem("tilesList", JSON.stringify(tilesList));
        RenderTilesList(tilesList, tilesListDisplay);
    }
}
function LoadLanguagesToDropDown(dropdownId) {
    $(dropdownId).html("");
    var s = $(dropdownId);
    $.each(instaledCultures, function (index, value) {
        var selected = false;
        if (value.Name == appSettings.CurentCulture) {
            selected = true;
            $(dropdownId)[0].selectedIndex = index + 1;
        }
        var o = new Option(T(value.Language), value.Name, selected, selected);//"<option value='" + index + "'> " + value.Language + "<option/>";//$('<option></option>').val(index).text(T(value.Language)); /// 
        $(dropdownId).append(o);

    });


}

function TranslateInterface() {
    var elements = document.querySelectorAll('[data-to-display]');
    for (i = 0; i < elements.length; i++) {
        var e = elements[i];
        var text = e.getAttribute('data-to-display');
        e.innerHTML = T(text);
    }

    $.mobile.loadingMessage = T("Wczytywanie");
}
//$("#MainPage").live("pageinit", function () {
//    ApplicationInitialization();

//});

function ApplicationInitialization() {

    $.ajaxSetup({
        timeout:5000,
        error: function (x, e) {
            var errorComunicate;
            if (x.status == 0) {
                errorComunicate = T(' Check Your Network.');
            }
            else if (x.status == 404) {
                errorComunicate = T('Requested URL not found.');

            } else if (x.status == 500) {
                errorComunicate = T('Internel Server Error.');
            } else {
                errorComunicate = T('Unknow Error.\n');// + x.responseText);
            }

            $('#errorComunicate').html(errorComunicate);
            $.mobile.changePage($('#ErrorPage'),
                {
                    transition: "pop",
                    changeHash: false
                });
        }
    });
    TranslateInterface();

    $(".live-tile, .flip-list").not(".exclude").liveTile();

    LoadAppSettings();
    $.mobile.changePage.defaults.allowSamePageTransition = true;
    //  getLocation();
}
$("#MainPage").live("pageshow", function () {

    GetTilesList('#dynamicTiles');
    isGroupSelected = true; // ustaw wybieranie z grup, wybieranie z anałuopw użytkownika bedzie ustwione na klikniecu w kafel
});

$("#ChannelsListPage").live("pagebeforeshow", function (prepage) {
    $('#ChannelsListView').html("");
});

$("#ChannelsListPage").live("pageshow", function (prepage) {


    if (!isGroupSelected) {
        GetChannelsList("userName", "#ChannelsListView");
    }
    else {
        GetChannelListForGroup(selectedGroup, "#ChannelsListView");
    }

    $('#ChannelsListView').listview("refresh");
});
$("#ChannelPostListPage").live("pagebeforeshow", function (prepage) {
    $('#channelPostList').html("");
});

$("#ChannelPostListPage").live("pageshow", function () {

    GetChannelContent(selectedChannel, "#channelPostList");
    $('#channelPostList').listview("refresh");
});

$("#ChannelPostContentPage").live("pagebeforeshow", function (prepage) {
    $.mobile.showPageLoadingMsg();
    $('#postContent').html("");
});
$("#ChannelPostContentPage").live("pageshow", function () {
    GetPostContent(selectedEntry);
    $.mobile.hidePageLoadingMsg();
});

$("#UserSettingsPage").live("pageshow", function () {

    LoadAppSettings();
    LoadLanguagesToDropDown('#languageSelect');
    setupAutoComplete();
    $('#userNameInp').val(appSettings.UserName);
    $('#siteUrlInp').val(appSettings.SiteUrl);

    $('#languageSelect').selectmenu("refresh");

    tmpPlace.Id = appSettings.Place.Id;
    tmpPlace.Name = appSettings.Place.Name;
    $('#placeSearch').val(appSettings.Place.Name);

    $('#overrideLocationChechBox').val(appSettings.OverrideLocation);

});

$(".contentLinkForChannel").live("click", function () {
    selectedEntry = $(this).data("entryid");
    selectedChannel = channelList[selectedEntry];
});
$(".contentLinkForPost").live("click", function () {
    selectedEntry = $(this).data("entryid");
    selectedPostIndex = selectedEntry;
});
$("#userChannels").live("click", function () {
    isGroupSelected = false;
});

$(".refresh-button").live("click", function () {
     tilesListIsUpdated = false;
     channelsListIsUpdated = false;
     postListForChannelIsUpdated = [];
});


$(document).ajaxStart(function () {
    $.mobile.loading('show');
});

$('#applySettingsBtn').live('click', function () {
    appSettings.UserName = $('#userNameInp').val();
    appSettings.SiteUrl = $('#siteUrlInp').val();
    appSettings.Place = new Place(tmpPlace.Id, tmpPlace.Name);
    var cc = $('#languageSelect').val();

    appSettings.SetCurrentCulture(cc);

    appSettings.OverrideLocation = $('#overrideLocationChechBox').val();

    window.localStorage.setItem("appSettings", JSON.stringify(appSettings));
});

$('#appExitBtn').live('click', function () {
    if ($.mobile.activePage.is('#MainPage')) {
        var os = detectDeviceOperatingSystem();

        //alert(device.platform);
        
        if ( os == "blackberry")
           blackberry.app.exit(); 
        else
            navigator.app.exitApp();
    }
    else {
        navigator.app.backHistory()
    }

});

$(document).ajaxStop(function () {
    $.mobile.loading('hide');
});

function setupAutoComplete() {
    var locationPickerUrl = appSettings.SiteUrl + "/Dictionaries/LocationPicker/GetPlaceLocations";

    $("#placeSearch").autocomplete({
        target: $('#placeSuggestions'),
        source: locationPickerUrl,
        callback: function (e) {
            var $a = $(e.currentTarget);

            tmpPlace.Id = $a.data('autocomplete').placeId;
            tmpPlace.Name = $a.data('autocomplete').value;

            if (typeof appSettings.Place.Id == 'undefined') {
                tmpPlace.Id = -1;
                tmpPlace.Name = "";
            }

            $('#placeSearch').val(tmpPlace.Name);
            $("#placeSearch").autocomplete('clear');

        },
        labelHTML: function (value) {
            return value;
        },
        builder: buildItemsForPlaces,
        link: 'target.html?term=',
        minLength: 3
    });

}

buildItemsForPlaces = function (data, settings) {
    var str = [];
    if (data) {
        $.each(data, function (index, value) {
            // are we working with objects or strings?
            if ($.isPlainObject(value)) {
                str.push('<li data-icon=' + settings.icon + '><a href="' + settings.link + encodeURIComponent(value.value) + '" data-transition="' + settings.transition + '" data-autocomplete=\'' + JSON.stringify(value) + '\'>' + settings.labelHTML(value.value) + '</a></li>');
            } else {
                str.push('<li data-icon=' + settings.icon + '><a href="' + settings.link + encodeURIComponent(value) + '" data-transition="' + settings.transition + '">' + settings.labelHTML(value) + '</a></li>');
            }
        });
    }

    if ($.isArray(str)) {
        str = str.join('');
    }
    return str;
}
/// database functions


//// geolocation
function getLocation() {
    var x = document.getElementById("geoLocationArea");
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition,
            geolocationError,
            { maximumAge: 3000, timeout: 5000, enableHighAccuracy: true });
        x.innerHTML = T("Localization procedure is running.")
    }
    else {
        x.innerHTML = T("Geolocation is not supported by this browser.");
    }
}

function showPosition(position) {
    $('#latValue').html(position.coords.latitude)
    $('#lngValue').html(position.coords.longitude)
    $('#accuracyValue').html(position.coords.accuracy)

    var x = $('#geoLocationArea');
    x.html("Latitude: " + position.coords.latitude + "<br>Longitude: " + position.coords.longitude);
}

function geolocationError(error) {
    //PositionError.PERMISSION_DENIED
    //PositionError.POSITION_UNAVAILABLE
    //PositionError.TIMEOUT
    var x = $('#geoLocationArea');
    x.html(T("Błąd w trkacie ustalania lokalizacji: ") + 'code: ' + error.code + ' ' +
        'message: ' + error.message + '\n');
}
var idx = 0; // do livetile caruzela

/// For PhoneGap

function openLinkInExternalBrowser(link) {
    navigator.app.loadUrl(link);
    window.plugins.childBrowser.showWebPage(link, { showLocationBar: true });
}
var app = {
    // Application Constructor
    initialize: function () {
        ApplicationInitialization();
        this.bindEvents();

    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        document.addEventListener("backbutton", function (e) {
            if ($.mobile.activePage.is('#homepage')) {
                e.preventDefault();
                navigator.app.exitApp();
            }
            else {
                navigator.app.backHistory()
            }
        }, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function () {
        //  GetTilesList('#dynamicTiles');
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function (id) {

        console.log('Received Event: ' + id);
    }
};
