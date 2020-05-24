$tooQuick = false;
$extruderTemp = 'N/A';
$extruderTarget = 'N/A';
$bedTemp = 'N/A';
$bedTarget = 'N/A';
$errorsCount = 0;

$axisX = '0';
$axisY = '0';
$axisZ = '0';

function pad(num, size) {
  var s = "000" + num;
  return s.substr(s.length - size);
}

function setupPolling() {
  setInterval(function() {
    var processingDz = $(".dz-processing");
    var uploading = processingDz.length == 1 && !processingDz.hasClass('dz-complete');
    var polling = $("#pollingPrinter").prop("checked");
    if (polling && !uploading) {
      $.ajax({
        url: "inquiry",
        timeout: 2500,
        cache: false,
        success: function(data) {
          $extruderTemp = data.match(/\d+/g)[0];
          $extruderTarget = data.match(/\d+/g)[1];
          $bedTemp = data.match(/\d+/g)[2];
          $bedTarget = data.match(/\d+/g)[3];
          $errorsCount = 0;

          var c = data.charAt(data.length - 1);
          if (c == 'I') {
            $("#stat").text("Idle");
            $("#pgs").css("width", "0%");
            $(".deactivatable").removeClass('disabled').attr("disabled", false);
            $("#stopprint").addClass('disabled').attr("disabled", true);
          } else if (c == 'P') {
            $(".deactivatable").addClass('disabled').attr("disabled", true);
            $("#stopprint").removeClass('disabled').attr("disabled", false);
            $("#stat").text("Printing");
            $("#pgs").css("width", data.match(/\d+/g)[4] + "%");
            $("#pgs").html(data.match(/\d+/g)[4] + "%");
          } else $("#stat").text(" ");
        },
        error: function(data) {
          $(".deactivatable").addClass('disabled').attr("disabled", true);
          $extruderTemp = 'N/A';
          $extruderTarget = 'N/A';
          $bedTemp = 'N/A';
          $bedTarget = 'N/A';
          $errorsCount++;
          if ($errorsCount == 10) {
            $("#pollingPrinter").prop("checked", false);
          }
        }
      });
    } else {
      $(".deactivatable").addClass('disabled').attr("disabled", true);
      $extruderTemp = 'N/A';
      $extruderTarget = 'N/A';
      $bedTemp = 'N/A';
      $bedTarget = 'N/A';
      if (uploading) {
        $errorsCount = 0;
      }
    }
    $("#rde").text($extruderTemp);
    $("#rdeTarget").text(isNaN($extruderTarget) ? $extruderTarget : +$extruderTarget || "Off");
    $("#rdp").text($bedTemp);
    $("#rdpTarget").text(isNaN($bedTarget) ? $bedTarget : +$bedTarget || "Off");
  }, 5000);
};

function pollingPrinterChanged(flag) {
  if (flag.checked) {
    $errorsCount = 0;
  }
};

function setExtruderTemp() {
  var value = pad($("#wre").val(), 3);
  $.ajax({
    url: 'set?cmd={C:T0' + value + '}',
    cache: false
  }).done(function(html) {});
};

function clearExtruderTemp() {
  $("#wre").val('');
  $.ajax({
    url: "set?cmd={C:T0000}",
    cache: false
  }).done(function(html) {});
};

function setBedTemp() {
  var value = pad($("#wrp").val(), 3);
  $.ajax({
    url: 'set?cmd={C:P' + value + '}',
    cache: false
  }).done(function(html) {});
};

function clearBedTemp() {
  $("#wrp").val('');
  $.ajax({
    url: "set?cmd={C:P000}",
    cache: false
  }).done(function(html) {});
};

function start_p() {
  var dryRunMode = $("#dryRunPrint").prop("checked");
  $.ajax({
    url: "set?code=M111 S" + (dryRunMode ? "8" : "0"),
    cache: false
  }).then(function() {
    return $.ajax({
      url: "set?code=M565",
      cache: false
    });
  }).done(function(html) {});
}

function cancel_p() {
  $.ajax({
    url: "set?cmd={P:X}",
    cache: false
  }).done(function(html) {});
}

function fast_wifi() {
  $.ajax({
    url: "set?code=M563 S5",
    cache: false
  }).done(function(html) {
    $('#gCodeLog').append("<br>Super fast transfer activated!");
    gCodeLog.scrollTop = gCodeLog.scrollHeight;
  });
}

function sendRawGCode() {
  var gCode2Send = $('#gcode').val();
  if (gCode2Send == '') {
    alert("You didn't enter anything!");
    return;
  }
  $.ajax({
    url: "set?code=" + gCode2Send,
    cache: false
  }).done(function(html) {
    $('#gcode').val('');
    $('#gCodeLog').append("<br>" + gCode2Send);
    gCodeLog.scrollTop = gCodeLog.scrollHeight;
  });
}

function eStop() {
  $.ajax({
    url: "set?code=M112\nM999",
    cache: false
  }).done(function(html) {
    $('#gCodeLog').append("<br>M112; Emergency Stop!");
    gCodeLog.scrollTop = gCodeLog.scrollHeight;
    alert('Emergency Stop Sent! You will have to cycle power on the printer to get communications back up.');
  });
};

function setFan($fSpeed) {
  $.ajax({
    url: "set?code=M106 S" + $fSpeed,
    cache: false
  }).done(function(html) {
    gCodeLog.scrollTop = gCodeLog.scrollHeight;
  });
}

function goHome(button) {
  var doWhat = $(button).data('id');
  var whatAxis = $(button).data('axis');
  $.ajax({
    url: "set?code=G28 " + doWhat,
    cache: false
  }).done(function(html) {
    if (whatAxis == 'XYZ') {
      $('#posX, #posY, #posZ').val('0');
      $axisX = '0';
      $axisY = '0';
      $axisZ = '0';
    } else if (whatAxis == 'XY') {
      $('#posX, #posY').val('0');
      $axisX = '0';
      $axisY = '0';
    } else {
      $('#pos' + whatAxis).val('0');
      switch (whatAxis) {
        case 'X':
          $axisX = '0';
          break;
        case 'Y':
          $axisY = '0';
          break;
        case 'Z':
          $axisZ = '0';
          break;
      }
    }
  });
};

function atMax() {
  $('#gCodeLog').append("<br>" + '<span style="color: #f00;">MAX Movement!</span>');
  gCodeLog.scrollTop = gCodeLog.scrollHeight;
}

function move(button) {
  if ($tooQuick == true) {
    $('#gCodeLog').append("<br>" + '<span style="color: #f00;">SLOW DOWN!</span>');
    gCodeLog.scrollTop = gCodeLog.scrollHeight;
    return;
  }

  var doSpeed = $(button).data('speed');
  var doWhat = $(button).data('id');
  var doWhere = $(button).data('axis');

  switch (doWhere) {
    case 'X':
      doWhat *= +$('input[name="movl"]:checked').val();
      $axisX = +$axisX + +doWhat;
      if ($axisX >= '125') {
        atMax();
        $axisX = +$axisX - +doWhat;
        return;
      }
      break;
    case 'Y':
      doWhat *= +$('input[name="movl"]:checked').val();
      $axisY = +$axisY + +doWhat;
      if ($axisY >= '125') {
        atMax();
        $axisY = +$axisY - +doWhat;
        return;
      }
      break;
    case 'Z':
      doWhat *= +$('input[name="movl"]:checked').val();
      $axisZ = +$axisZ + +doWhat;
      if ($axisZ >= '125') {
        atMax();
        $axisZ = +$axisZ - +doWhat;
        return;
      }
      break;
    case 'E':
      doWhat *= +$("#exl").val() || 5;
      break;
    default:
  }

  $tooQuick = true;
  $.ajax({
    url: "set?code=G91",
    cache: false
  }).done(function(html) {});
  $.ajax({
    url: "set?code=G1 " + doSpeed + ' ' + doWhere + doWhat,
    cache: false
  }).done(function(html) {
    var axisVal = $('#pos' + doWhere).val();
    axisVal = +doWhat + +axisVal;
    $('#pos' + doWhere).val(axisVal);
    $tooQuick = false;
  });
};

function getPoints(data, newValue) {
  data.points = data.points.slice(1);

  var x = new Date($.now());
  var y = newValue;
  data.points.push([x, y]);

  return data.points;
}

function initializeData() {
  var data = { points: [] };

  var totalPoints = 300;
  while (data.points.length < totalPoints) {
    data.points.push([new Date($.now() - 1000 * data.points.length), "N/A"]);
  }
  return data;
}

function setupTempChart() {
  var data = initializeData();
  var data2 = initializeData();
  var data3 = initializeData();
  var data4 = initializeData();

  var updateInterval = 500;
  var plot = $.plot("#tempChart", [getPoints(data4, $bedTarget), getPoints(data3, $extruderTarget), getPoints(data2, $bedTemp), getPoints(data, $extruderTemp)], {
    series: {
      shadowSize: 0
    },
    colors: ['#84CFEE', '#FF7189', '#33B5E5', '#FF3547'],
    grid: {
      borderColor: "#000"
    },
    yaxis: {
      min: 1,
      max: 275
    },
    xaxis: {
      mode: "time",
      timeformat: "%H:%M",
      timezone: "browser",
      tickSize: [1, "minute"]
    }
  });

  function update() {
    plot.setData([getPoints(data4, $bedTarget), getPoints(data3, $extruderTarget), getPoints(data2, $bedTemp), getPoints(data, $extruderTemp)]);
    plot.setupGrid();
    plot.draw();
    setTimeout(update, updateInterval);
  }

  update();
};

function fanSpeedChanged(slider) {
  var fanPercent = slider.value;
  setFan(slider.value);
  var fanMax = 255;
  fanPercent = (fanPercent / fanMax) * 100;
  if (fanPercent == '0') {
    fanPercent = "Off";
  } else {
    fanPercent = fanPercent + "%";
  }
  $("#fanAmount").html(fanPercent);
};