export namespace main {
	
	export class DateRange {
	    startDate: string;
	    endDate: string;
	
	    static createFrom(source: any = {}) {
	        return new DateRange(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startDate = source["startDate"];
	        this.endDate = source["endDate"];
	    }
	}
	export class ExportOptions {
	    includeQuestions: boolean;
	    includeGroups: boolean;
	    includeSessions: boolean;
	    includeSettings: boolean;
	    includeWrongQuestions: boolean;
	    groupIds: string[];
	    dateRange?: DateRange;
	    format: string;
	
	    static createFrom(source: any = {}) {
	        return new ExportOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.includeQuestions = source["includeQuestions"];
	        this.includeGroups = source["includeGroups"];
	        this.includeSessions = source["includeSessions"];
	        this.includeSettings = source["includeSettings"];
	        this.includeWrongQuestions = source["includeWrongQuestions"];
	        this.groupIds = source["groupIds"];
	        this.dateRange = this.convertValues(source["dateRange"], DateRange);
	        this.format = source["format"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ImportResult {
	    success: boolean;
	    imported: number;
	    errors: string[];
	    duplicates: number;
	
	    static createFrom(source: any = {}) {
	        return new ImportResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.imported = source["imported"];
	        this.errors = source["errors"];
	        this.duplicates = source["duplicates"];
	    }
	}
	export class PracticeSession {
	    id: string;
	    groupId: string;
	    mode: string;
	    startTime: string;
	    endTime?: string;
	    duration: number;
	    totalQuestions: number;
	    correctCount: number;
	    details: number[];
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new PracticeSession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.groupId = source["groupId"];
	        this.mode = source["mode"];
	        this.startTime = source["startTime"];
	        this.endTime = source["endTime"];
	        this.duration = source["duration"];
	        this.totalQuestions = source["totalQuestions"];
	        this.correctCount = source["correctCount"];
	        this.details = source["details"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class Question {
	    id: string;
	    question: string;
	    options: number[];
	    answer: number[];
	    explanation: string;
	    tags: number[];
	    imageUrl: string;
	    difficulty?: number;
	    source: string;
	    index?: number;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Question(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.question = source["question"];
	        this.options = source["options"];
	        this.answer = source["answer"];
	        this.explanation = source["explanation"];
	        this.tags = source["tags"];
	        this.imageUrl = source["imageUrl"];
	        this.difficulty = source["difficulty"];
	        this.source = source["source"];
	        this.index = source["index"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class QuestionGroup {
	    id: string;
	    name: string;
	    description: string;
	    parentId?: string;
	    color: string;
	    icon: string;
	    questionIds: string[];
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new QuestionGroup(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.parentId = source["parentId"];
	        this.color = source["color"];
	        this.icon = source["icon"];
	        this.questionIds = source["questionIds"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class WrongQuestion {
	    id: string;
	    questionId: string;
	    addedAt: string;
	    reviewedAt?: string;
	    timesReviewed: number;
	    lastResult: boolean;
	    notes: string;
	
	    static createFrom(source: any = {}) {
	        return new WrongQuestion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.questionId = source["questionId"];
	        this.addedAt = source["addedAt"];
	        this.reviewedAt = source["reviewedAt"];
	        this.timesReviewed = source["timesReviewed"];
	        this.lastResult = source["lastResult"];
	        this.notes = source["notes"];
	    }
	}

}

