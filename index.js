const cheerio = require('cheerio')
const async = require('async')
const request = require('request').defaults({
	jar: true,
	followAllRedirects: true
})

const baseURL = 'https://sis-phuket' + Math.floor(Math.random() * 9 + 1) + '.psu.ac.th'
const username = '5835512030'
const password = ''
const semester = '2/2560'

const subjects = [
	{
		code: '322-201',
		type: 'C',
		section: 1
	},
	{
		code: '242-210',
		type: 'C',
		section: 1
	},
	{
		code: '242-214',
		type: 'C',
		section: 1
	},
	{
		code: '242-309',
		type: 'C',
		section: 1
	},
	{
		code: '242-209',
		type: 'C',
		section: 1
	},
	{
		code: '242-308',
		type: 'C',
		section: 1
	},
	{
		code: '242-311',
		type: 'C',
		section: 2
	},
	{
		code: '242-320',
		type: 'C',
		section: 1
	},
	{
		code: '242-310',
		type: 'C',
		section: 2
	},
	{
		code: '242-302',
		type: 'C',
		section: 2
	}
]

let $, form, name

async.series(
	[
		cb => {
			// GET LOGIN CSRF TOKEN
			request.post(`${baseURL}/WebRegist2005/Login.aspx`, (error, response, body) => {
				if (!error && response.statusCode == 200) {
					$ = cheerio.load(body)
					form = serializeArrayToJSON(
						$('form#aspnetForm')
							.first()
							.serializeArray()
					)
					form['ctl00$mainContent$Login1$UserName'] = username
					form['ctl00$mainContent$Login1$Password'] = password
					form['__EVENTTARGET'] = 'ctl00$mainContent$Login1$LoginButton'
					cb()
				} else {
					cb('ERROR')
				}
			})
		},
		cb => {
			// POST LOGIN DATA
			request.post(
				`${baseURL}/WebRegist2005/Login.aspx`,
				{
					form
				},
				(error, response, body) => {
					if (!error && response.statusCode == 200) {
						$ = cheerio.load(body)

						if (typeof $('span#ctl00_ctl00_LoginView1_LoginName1').first() === 'undefined') {
							return cb('INVALID_PASSWORD')
						}

						name = $('span#ctl00_ctl00_LoginView1_LoginName1')
							.first()
							.text()
						name = name.split('- ')[1]
						console.log('[+] LOGGED IN AS ' + name)
						form = serializeArrayToJSON(
							$('form#aspnetForm')
								.first()
								.serializeArray()
						)
						cb()
					} else {
						cb('ERROR')
					}
				}
			)
		},
		cb => {
			// GET ENROLL DETAILS CSRF TOKEN
			request.post(
				`${baseURL}/WebRegist2005/Enroll/Default.aspx`,
				{
					form
				},
				(error, response, body) => {
					if (!error && response.statusCode == 200) {
						$ = cheerio.load(body)
						form = serializeArrayToJSON(
							$('form#aspnetForm')
								.first()
								.serializeArray()
						)
						form['ctl00$ctl00$mainContent$PageContent$DropDownList1'] = semester
						form['ctl00$ctl00$mainContent$PageContent$nextButton'] = 'Next >>'
						cb()
					} else {
						cb('ERROR')
					}
				}
			)
		},
		cb => {
			// SELECT ENROLL SEMESTER
			request.post(
				`${baseURL}/WebRegist2005/Enroll/Default.aspx`,
				{
					form
				},
				(error, response, body) => {
					if (!error && response.statusCode == 200) {
						$ = cheerio.load(body)
						form = serializeArrayToJSON(
							$('form#aspnetForm')
								.first()
								.serializeArray()
						)
						console.log('[+] SELECTED SEMESTER ' + semester)
						cb(
							$('span#ctl00_ctl00_mainContent_PageContent_ucAttention1_lblAttention')
								.first()
								.text() || null
						)
					} else {
						cb('ERROR')
					}
				}
			)
		},
		cb => {
			// LOOP EACH SUBJECT
			async.each(
				subjects,
				(subject, cb) => {
					let subjectID, subjectOfferID
					async.series(
						[
							cb => {
								// GET OPEN SUBJECT CSRF TOKEN
								request.post(
									`${baseURL}/WebRegist2005/Enroll/FindOpenSubject.aspx`,
									{
										form
									},
									(error, response, body) => {
										if (!error && response.statusCode == 200) {
											$ = cheerio.load(body)
											form = serializeArrayToJSON(
												$('form#aspnetForm')
													.first()
													.serializeArray()
											)
											form['ctl00$ctl00$mainContent$PageContent$UcFindSubject1$txtKeyWord'] = subject.code
											console.log('[+] [' + subject.code + '] FINDIND SUBJECT')
											cb()
										} else {
											cb('ERROR')
										}
									}
								)
							},
							cb => {
								// FIND OPEN SUBJECT
								request.post(
									`${baseURL}/WebRegist2005/Enroll/FindOpenSubject.aspx`,
									{
										form
									},
									(error, response, body) => {
										if (!error && response.statusCode == 200) {
											$ = cheerio.load(body)
											form = serializeArrayToJSON(
												$('form#aspnetForm')
													.first()
													.serializeArray()
											)
											subjectID = getSubjectID(
												$("input[name='ctl00$ctl00$mainContent$PageContent$UcFindSubject1$GridView1$ctl02$Button1']")
													.first()
													.attr('onclick')
											)
											subjectOfferID = getSubjectOfferID(
												$("input[name='ctl00$ctl00$mainContent$PageContent$UcFindSubject1$GridView1$ctl02$Button1']")
													.first()
													.attr('onclick')
											)

											if (
												typeof $("input[name='ctl00$ctl00$mainContent$PageContent$UcFindSubject1$GridView1$ctl02$Button1']").first() ===
												'undefined'
											)
												return cb('SUBJECT NOT FOUND')

											console.log('[+] [' + subject.code + '] SUBJECT FOUND!')
											cb()
										} else {
											cb('ERROR')
										}
									}
								)
							},
							cb => {
								// SELECT FIRST SUBJECT
								request.post(
									`${baseURL}/WebRegist2005/Enroll/SubjectDetailToAdd.aspx?aSubjectID=${subjectID}&aSubjectOfferID=${subjectOfferID}`,
									{
										form
									},
									(error, response, body) => {
										if (!error && response.statusCode == 200) {
											$ = cheerio.load(body)
											form = serializeArrayToJSON(
												$('form#aspnetForm')
													.first()
													.serializeArray()
											)
											form['ctl00$ctl00$mainContent$PageContent$gvPendingEnroll$ctl02$ddlSection'] = subjectOfferID + '0' + subject.section
											form['ctl00$ctl00$mainContent$PageContent$gvPendingEnroll$ctl02$ddlRegistType'] = subjectOfferID + '0' + subject.type
											form['ctl00$ctl00$mainContent$PageContent$btnAdd'] = 'Add for Registration'

											console.log(
												'[+] [' + subject.code + '] ADDING TO LIST (SECTION 0' + subject.section + ' | TYPE = ' + subject.type + ')'
											)
											cb()
										} else {
											cb('ERROR')
										}
									}
								)
							},
							cb => {
								//  ADD TO REGISTRATION LIST
								request.post(
									`${baseURL}/WebRegist2005/Enroll/SubjectDetailToAdd.aspx?aSubjectID=${subjectID}&aSubjectOfferID=${subjectOfferID}`,
									{
										form
									},
									(error, response, body) => {
										if (!error && response.statusCode == 200) {
											$ = cheerio.load(body)
											form = serializeArrayToJSON(
												$('form#aspnetForm')
													.first()
													.serializeArray()
											)
											form['ctl00$ctl00$mainContent$PageContent$btnConfirm'] = 'Confirm The Registration'

											if (
												$('span#ctl00_ctl00_mainContent_PageContent_UcAttention1_lblAttention')
													.first()
													.text()
											)
												return cb(
													$('span#ctl00_ctl00_mainContent_PageContent_UcAttention1_lblAttention')
														.first()
														.text()
												)

											console.log('[+] [' + subject.code + '] ADDED TO LIST')
											cb()
										} else {
											cb('ERROR')
										}
									}
								)
							},
							cb => {
								// CONFIRM REGISTRATION (SUCCESS)
								request.post(
									`${baseURL}/WebRegist2005/Enroll/EnrollDetail.aspx`,
									{
										form
									},
									(error, response, body) => {
										if (!error && response.statusCode == 200) {
											cb()
										} else {
											cb('ERROR')
										}
									}
								)
							}
						],
						err => {
							if (err) {
								console.log('[+] [' + subject.code + '] ' + err)
							} else {
								console.log('[+] [' + subject.code + '] SUBJECT CONFIRMED!')
							}
							cb()
						}
					)
				},
				cb
			)
		}
	],
	err => {
		console.log('[+] ALL SUBJECT ADDED COMPLETE!')
		process.exit(0)
	}
)

const serializeArrayToJSON = o => {
	let j = {}
	o.forEach(i => {
		j[i.name] = i.value
	})
	return j
}

const getSubjectID = j => {
	return j.substring(j.indexOf('aSubjectID=') + 11, j.indexOf('&aSubjectOfferID'))
}

const getSubjectOfferID = j => {
	return j.substring(j.indexOf('aSubjectOfferID=') + 16, j.indexOf('", false, false'))
}
