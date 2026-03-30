// Finance Analyzer — script.js

let currentData = null;

// toggle strategy tags
document.querySelectorAll('.tag').forEach(function(t) {
  t.onclick = function() { t.classList.toggle('on'); };
});

// UTILITIES

function showErr(msg) {
  var el = document.getElementById('errMsg');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideErr() {
  document.getElementById('errMsg').style.display = 'none';
}

// RUN SCREENING

async function runScreen() {
  var company = document.getElementById('coInput').value.trim();
  if (!company) { showErr('Please enter a company name.'); return; }

  var context = document.getElementById('ctxInput').value.trim();
  var strategy = Array.from(document.querySelectorAll('.tag.on')).map(function(t) { return t.dataset.v; });
  if (!strategy.length) { showErr('Select at least one investment strategy.'); return; }

  hideErr();
  document.getElementById('runBtn').disabled = true;
  document.getElementById('statusBar').style.display = 'flex';
  document.getElementById('resultsPanel').style.display = 'none';
  document.getElementById('statusTxt').textContent = 'Researching and analyzing...';

  try {
    var res = await fetch('/api/screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: company, context: context, thesis: strategy })
    });

    var data = await res.json();
    if (data.error) throw new Error(data.error);

    currentData = data;
    renderResults(data);

  } catch (err) {
    document.getElementById('statusBar').style.display = 'none';
    document.getElementById('runBtn').disabled = false;
    showErr('Error: ' + err.message);
  }
}

// RENDER RESULTS

function renderResults(d) {
  document.getElementById('statusBar').style.display = 'none';
  document.getElementById('runBtn').disabled = false;

  document.getElementById('rName').textContent    = d.company_name;
  document.getElementById('rType').textContent    = d.company_type;
  document.getElementById('rSummary').textContent = d.exec_summary;

  // fit badge
  var badge = document.getElementById('rBadge');
  badge.textContent = d.overall_fit;
  badge.className   = 'fit-badge ' + (
    d.overall_fit === 'Strong fit'   ? 'fit-strong'   :
    d.overall_fit === 'Moderate fit' ? 'fit-moderate'  :
                                       'fit-weak'
  );

  // score cards
  document.getElementById('rScores').innerHTML = d.scores.map(function(s) {
    var barClass = s.score >= 7 ? 'fill-high' : s.score >= 5 ? 'fill-mid' : 'fill-low';
    return '<div class="score-card">' +
      '<div class="score-lbl">' + s.label + '</div>' +
      '<div class="score-track"><div class="score-fill ' + barClass + '" style="width:' + (s.score * 10) + '%"></div></div>' +
      '<div><span class="score-num">' + s.score + '</span><span class="score-denom">/10</span></div>' +
      '<div class="score-note">' + s.note + '</div>' +
      '</div>';
  }).join('');

  // investment memo
  var redFlags = d.memo.red_flags.map(function(f) { return '<li>' + f + '</li>'; }).join('');
  var keyQs    = d.memo.key_questions.map(function(q) { return '<li>' + q + '</li>'; }).join('');

  document.getElementById('rMemo').innerHTML =
    '<div class="memo-section">' +
      '<div class="memo-section-title">What they do</div>' +
      '<div class="memo-body">' + d.memo.what_they_do + '</div>' +
    '</div>' +
    '<div class="memo-section">' +
      '<div class="memo-section-title">Why this is interesting</div>' +
      '<div class="memo-body">' + d.memo.why_interesting + '</div>' +
    '</div>' +
    '<div class="memo-section">' +
      '<div class="memo-section-title">Red flags</div>' +
      '<ul class="memo-list">' + redFlags + '</ul>' +
    '</div>' +
    '<div class="memo-section">' +
      '<div class="memo-section-title">Key questions to ask</div>' +
      '<ul class="memo-list">' + keyQs + '</ul>' +
    '</div>';

  document.getElementById('rGate').textContent        = d.memo.human_gate_reason;
  document.getElementById('gateBtns').style.display   = 'flex';
  document.getElementById('decBanner').style.display  = 'none';
  document.getElementById('resultsPanel').style.display = 'block';

  document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// PDF BUILDER

function buildPDF() {
  var jsPDF = window.jspdf.jsPDF;
  var doc    = new jsPDF({ unit: 'pt', format: 'letter' });
  var d      = currentData;
  var W      = doc.internal.pageSize.getWidth();
  var margin = 48;
  var maxW   = W - margin * 2;
  var y      = 48;

  function addPage()   { doc.addPage(); y = 48; }
  function checkPage(h) { if (y + h > 720) addPage(); }

  // top bar
  doc.setFillColor(100, 149, 237);
  doc.rect(0, 0, W, 6, 'F');

  // eyebrow
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 130, 180);
  doc.text('FINANCE ANALYZER — INVESTMENT MEMO', margin, y);
  y += 24;

  // company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(30, 30, 30);
  doc.text(d.company_name, margin, y);
  y += 8;

  // company type + fit badge
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(d.company_type, margin, y + 14);

  var fitColor = d.overall_fit === 'Strong fit'
    ? [76, 175, 125]
    : d.overall_fit === 'Moderate fit'
    ? [232, 160, 48]
    : [224, 90, 90];

  doc.setFillColor(fitColor[0], fitColor[1], fitColor[2]);
  var badgeW = doc.getTextWidth(d.overall_fit) + 20;
  doc.roundedRect(W - margin - badgeW, y, badgeW, 20, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(d.overall_fit, W - margin - badgeW + 10, y + 13);
  y += 36;

  // divider
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 20;

  // executive summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 149, 237);
  doc.text('EXECUTIVE SUMMARY', margin, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  var summaryLines = doc.splitTextToSize(d.exec_summary, maxW);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 14 + 24;

  // dimension scores
  checkPage(80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 149, 237);
  doc.text('DIMENSION SCORES', margin, y);
  y += 14;

  var scoreW = (maxW - 16) / 5;

  d.scores.forEach(function(s, i) {
    var x        = margin + i * (scoreW + 4);
    var barColor = s.score >= 7 ? [76, 175, 125] : s.score >= 5 ? [232, 160, 48] : [224, 90, 90];

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(x, y, scoreW, 52, 4, 4, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(s.label.toUpperCase(), x + 8, y + 12);

    doc.setFillColor(220, 220, 220);
    doc.roundedRect(x + 8, y + 18, scoreW - 16, 3, 1, 1, 'F');

    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.roundedRect(x + 8, y + 18, (scoreW - 16) * s.score / 10, 3, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text(String(s.score), x + 8, y + 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    var noteLines = doc.splitTextToSize(s.note, scoreW - 16);
    doc.text(noteLines[0] || '', x + 8, y + 48);
  });

  y += 72;

  // memo sections
  var memoSections = [
    { title: 'WHAT THEY DO',         body: d.memo.what_they_do },
    { title: 'WHY INTERESTING',      body: d.memo.why_interesting },
    { title: 'RED FLAGS',            body: d.memo.red_flags.map(function(f, i) { return (i + 1) + '. ' + f; }).join('\n') },
    { title: 'KEY QUESTIONS TO ASK', body: d.memo.key_questions.map(function(q, i) { return (i + 1) + '. ' + q; }).join('\n') },
    { title: 'DECISION NOTE',        body: d.memo.human_gate_reason }
  ];

  memoSections.forEach(function(sec) {
    var bodyLines = doc.splitTextToSize(sec.body, maxW - 24);
    var secH      = 14 + bodyLines.length * 14 + 24;
    checkPage(secH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 149, 237);
    doc.text(sec.title, margin, y);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(bodyLines, margin, y);
    y += bodyLines.length * 14 + 20;

    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y - 8, W - margin, y - 8);
  });

  // footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  var dateStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text('Generated by Finance Analyzer on ' + dateStr, margin, 750);
  doc.setFillColor(100, 149, 237);
  doc.rect(0, 756, W, 4, 'F');

  return doc;
}

// EXPORT PDF

function exportPDF() {
  if (!currentData) return;
  var doc      = buildPDF();
  var fileName = currentData.company_name.replace(/\s+/g, '-').toLowerCase() + '-memo.pdf';
  doc.save(fileName);
}

// ADVANCE TO MEETING

function advanceToMeeting() {
  if (!currentData) return;
  var d = currentData;

  var doc      = buildPDF();
  var fileName = d.company_name.replace(/\s+/g, '-').toLowerCase() + '-memo.pdf';
  doc.save(fileName);

  var avgScore = Math.round(d.scores.reduce(function(a, s) { return a + s.score; }, 0) / d.scores.length * 10) / 10;

  var subject = encodeURIComponent('Investment Review: ' + d.company_name + ' (' + d.overall_fit + ')');
  var body    = encodeURIComponent(
'Hi,\n\n' +
'I am advancing ' + d.company_name + ' to a meeting based on our investment screening.\n\n' +
'Overall fit: ' + d.overall_fit + '\n' +
'Average score: ' + avgScore + '/10\n\n' +
'Summary: ' + d.exec_summary + '\n\n' +
'Key questions for the meeting:\n' +
d.memo.key_questions.map(function(q, i) { return (i + 1) + '. ' + q; }).join('\n') + '\n\n' +
'Red flags to watch:\n' +
d.memo.red_flags.map(function(f, i) { return (i + 1) + '. ' + f; }).join('\n') + '\n\n' +
'Full investment memo attached.\n\nBest'
  );

  window.open('https://mail.google.com/mail/?view=cm&fs=1&su=' + subject + '&body=' + body, '_blank');

  decide('advance');
}

// HUMAN DECISION

function decide(action) {
  document.getElementById('gateBtns').style.display = 'none';

  var banner = document.getElementById('decBanner');
  banner.style.display = 'block';
  banner.className     = 'decision-banner ' + (action === 'advance' ? 'ban-adv' : 'ban-pass');
  banner.textContent   = action === 'advance'
    ? 'Decision recorded: advancing to meeting. PDF downloaded and Gmail draft opened.'
    : 'Decision recorded: passing on this opportunity.';
}

// RESET

function resetApp() {
  document.getElementById('coInput').value  = '';
  document.getElementById('ctxInput').value = '';
  document.getElementById('resultsPanel').style.display = 'none';
  hideErr();
  currentData = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
