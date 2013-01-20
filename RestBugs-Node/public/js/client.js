var myModule = angular.module('myModule', []);
function MyController($scope, $http) {
    
    var parser = new DOMParser();

    $http.get(window.selfUrl).success(function(data) {
      
      $scope.categories = [];
            
      var rels = $("a[rel!=index]", data);      
      
      _.each(rels, function(link, index){   
        
        $http.get($(link).attr("href")).success(function(data){                  
          
          var xmlDoc = parser.parseFromString(data,"text/xml");
          var bugsToParse = $(".all li", $(xmlDoc.getElementById("bugs")));

          var bugs = _.map(bugsToParse, function(bugToParse){
            return {
              title: $(".title", bugToParse).text(),
              description: $(".description", bugToParse).text(),
            };
          });

          var viewModel = {
            name: $(link).attr("rel"), 
            bugs: bugs, 
            order: index
          };

          $scope.categories.push(viewModel);
          
        });      
      });

    });    
}

$(function(){
    
  window.selfUrl = $("a[rel=index]").attr("href");

  // Load template and bootstrap angular
  $.ajax({url: "../templates.html"}).done(function(templates){  
     
    var template = $("#angular-template", $(templates)).text();            
    $("body").html(template);
    
    var containerElement = $('body');
    angular.bootstrap(containerElement, ['myModule']);    
  });

});
