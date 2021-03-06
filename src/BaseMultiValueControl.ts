import * as VSSService from "VSS/Service";
import * as WitService from "TFS/WorkItemTracking/Services";
import * as VSSUtilsCore from "VSS/Utils/Core";
import * as Controls from "VSS/Controls";
import * as Combos from "VSS/Controls/Combos";
import * as ExtensionContracts  from "TFS/WorkItemTracking/ExtensionContracts";
import Q = require("q");

export class BaseMultiValueControl {
    /**
     * Field name input for the control
     */
    public fieldName: string;

    /**
     * The container to hold the control
     */
    protected containerElement: JQuery;
    
    /**
     * The container for error message display
     */
    private _errorPane: JQuery;

    private _flushing: boolean;
    private _bodyElement: HTMLBodyElement;

    /**
     * Store the last recorded window width to know
     * when we have been shrunk and should resize
     */
    private _windowWidth: number;
    private _minWindowWidthDelta: number = 10; // Minum change in window width to react to
    private _windowResizeThrottleDelegate: Function;
    
    constructor() {
        this.containerElement = $(".container");
        this._errorPane = $("<div>").addClass("errorPane").appendTo(this.containerElement);

        var inputs: IDictionaryStringTo<string> = VSS.getConfiguration().witInputs;

        this.fieldName = inputs["FieldName"];
        if (!this.fieldName) {
            this.showError("FieldName input has not been specified");
        }  

        this._windowResizeThrottleDelegate = VSSUtilsCore.throttledDelegate(this, 50, () => {
            this._windowWidth = window.innerWidth;
            this.resize();
        });

        this._windowWidth = window.innerWidth;
        $(window).resize(() => {
            if(Math.abs(this._windowWidth - window.innerWidth) > this._minWindowWidthDelta) {
               this._windowResizeThrottleDelegate.call(this);
            }
        });
    }

    /**
     * Initialize a new instance of Control
     */
    public initialize(): void {
        this.invalidate();
    }   

    /**
     * Invalidate the control's value
     */
    public invalidate(): void {
        if (!this._flushing) {
            this._getCurrentFieldValue().then(
                (value: string) => {
                    this.setValue(value);
                }
            );
        }

        this.resize();
    }

    public clear(): void {
        
    }    

    /**
     * Flushes the control's value to the field
     */
    protected flush(): void {
        this._flushing = true;
        WitService.WorkItemFormService.getService().then(
            (service: WitService.IWorkItemFormService) => {
                service.setFieldValue(this.fieldName, this.getValue()).then(
                    (values) => {
                        this._flushing = false;
                    },
                    () => {
                        this._flushing = false;
                        this.showError("Error storing the field value");
                    }
                )
            }
        );
    }

    protected getValue(): string {
        return "";
    }

    protected setValue(value: string): void {
        
    }
    
    protected showError(error: string): void {
        this._errorPane.text(error);
        this._errorPane.show();
    }

    protected clearError() {
        this._errorPane.text("");
        this._errorPane.hide();
    }

    private _getCurrentFieldValue(): IPromise<string> {
        var defer = Q.defer();
        WitService.WorkItemFormService.getService().then(
            (service) => {
                service.getFieldValues([this.fieldName]).then(
                    (values) => {
                        defer.resolve(values[this.fieldName]);
                    },
                    () => {
                        this.showError("Error loading values for field: " + this.fieldName)
                    }
                )
            }
        );

        return defer.promise;
    }

    protected resize() {
        this._bodyElement = <HTMLBodyElement>document.getElementsByTagName("body").item(0);

        // Cast as any until declarations are updated
        (VSS as any).resize(null, this._bodyElement.offsetHeight);  
    }
}