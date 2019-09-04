$(document).ready(function(){

  // Enables or disables the second input field depending on whether a filter will be used.
  $("input[name=queryParameter]").prop("disabled", true);
  $("select[name=queryOption]").on("change", function(){
    if ($("select[name=queryOption] option:selected").val() === "allRecords") {
      $("input[name=queryParameter]").prop("disabled", true);
    } else {
      $("input[name=queryParameter]").prop("disabled", false);
    }
  });
});
