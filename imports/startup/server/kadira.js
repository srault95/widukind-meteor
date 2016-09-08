if (process.env.WIDUKIND_KADIRA_ID && process.env.WIDUKIND_KADIRA_SECRET){
	Kadira.connect(process.env.WIDUKIND_KADIRA_ID, process.env.WIDUKIND_KADIRA_SECRET);
}