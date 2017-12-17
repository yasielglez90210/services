import {Component, OnInit} from '@angular/core';
import {ApiService} from '../../_services/api.service';

@Component({
    selector: 'app-showmyservices',
    templateUrl: './showmyservices.component.html',
    styleUrls: ['./showmyservices.component.css']
})
export class ShowmyservicesComponent implements OnInit {
    services: any;

    constructor(private apiServices: ApiService) {
    }

    ngOnInit() {
        this.apiServices.myServices().subscribe(result => this.services = result);
    }

}
