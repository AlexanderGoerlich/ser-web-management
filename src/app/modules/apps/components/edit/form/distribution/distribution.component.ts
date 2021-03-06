import { Component, OnInit, HostBinding, Input } from '@angular/core';
import { MatSelectChange } from '@angular/material';
import { ISerApp } from '@core/modules/ser-app/api/ser-app.interface';

@Component({
    selector: 'app-edit-form-distribution',
    templateUrl: 'distribution.component.html',
    styleUrls: ['./distribution.component.scss']
})
export class DistributionComponent implements OnInit {

    public distributionMethods = ['email', 'file', 'hub'];

    public selectedMethod: string;

    @Input()
    public app: ISerApp;

    constructor() { }

    ngOnInit() { }

    public selectDistributionMethod(method: MatSelectChange) {
        this.selectedMethod = method.value;
    }
}
