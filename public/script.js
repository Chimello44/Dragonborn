$(document).ready(function(){

  // Restricts the first input field to accept either Cluster or Site ID.

  // $("input[name=inputForm]").attr({
  //   pattern: "[A-Za-z]{3}",
  //   title: "Cluster ID"
  // });

  $("input[name=inputForm]").attr({
    pattern: "[A-Za-z]{3}[0-9]{1,2}",
    title: "Site ID"
  });

  $("select[name=queryClusterAZ]").on("change", function(){
    if ($("select[name=queryClusterAZ] option:selected").val() === "az") {
      $("input[name=inputForm]").attr({
        pattern: "[A-Za-z]{3}[0-9]{1,2}",
        title: "Site ID"
      });
    } else {
      $("input[name=inputForm]").attr({
        pattern: "[A-Za-z]{3}",
        title: "Cluster ID"
      });
    }
  });

  // Enables or disables the second input field depending on whether a filter will be used.
  $("input[name=queryParameter]").prop("disabled", true);
  $("select[name=queryOption]").on("change", function(){
    if ($("select[name=queryOption] option:selected").val() === "allRecords") {
      $("input[name=queryParameter]").prop("disabled", true);
    } else {
      $("input[name=queryParameter]").prop("disabled", false);
    }
  });

  $("input[name=az]").attr({
    pattern: "[A-Za-z]{3}[0-9]{1,2}",
    title: "Site ID"
  });



  // Patch-Panel

  // Assign all elements to capacity.
  var capacity = $("p[name=capacity]");

  // Loop through each element.
  capacity.each(function(){
    var totalCap = parseInt($(this).text()[18] + $(this).text()[19]);
    // $(this) refers to each element.
    if (totalCap < 5) {
      $(this).addClass("bg-busy");
    } else if (totalCap < 11) {
      $(this).addClass("bg-almost");
    } else {
      $(this).addClass("progress-bar");
    }
  });

  $("input[name=rack]").attr({
    pattern: "[A-Za-z]{3}[0-9]{1,2}.[0-9]{1,2}-[0-9]{1,2}.+[0-9]",
    title: "Rack Position"
  });

  $("input[name=device]").attr({
    pattern: "[A-Za-z]{3}[0-9]{1,2}-.+",
    title: "Hostname"
  });

});
