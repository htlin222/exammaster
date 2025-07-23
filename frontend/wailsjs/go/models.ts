export namespace main {
	
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
	    // Go type: time
	    startTime: any;
	    // Go type: time
	    endTime?: any;
	    duration: number;
	    totalQuestions: number;
	    correctCount: number;
	    details: number[];
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new PracticeSession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.groupId = source["groupId"];
	        this.mode = source["mode"];
	        this.startTime = this.convertValues(source["startTime"], null);
	        this.endTime = this.convertValues(source["endTime"], null);
	        this.duration = source["duration"];
	        this.totalQuestions = source["totalQuestions"];
	        this.correctCount = source["correctCount"];
	        this.details = source["details"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
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
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
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
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
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
	export class QuestionGroup {
	    id: string;
	    name: string;
	    description: string;
	    parentId?: string;
	    color: string;
	    icon: string;
	    questionIds: string[];
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
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
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
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
	export class WrongQuestion {
	    id: string;
	    questionId: string;
	    // Go type: time
	    addedAt: any;
	    // Go type: time
	    reviewedAt?: any;
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
	        this.addedAt = this.convertValues(source["addedAt"], null);
	        this.reviewedAt = this.convertValues(source["reviewedAt"], null);
	        this.timesReviewed = source["timesReviewed"];
	        this.lastResult = source["lastResult"];
	        this.notes = source["notes"];
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

}

